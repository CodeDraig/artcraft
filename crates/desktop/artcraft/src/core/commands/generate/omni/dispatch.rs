use super::errors::{api_error, command_error, local_error};
use super::image_inputs::resolve_image_inputs;
use super::request::{Modality, OmniRequest};
use crate::core::commands::enqueue::common::notify_frontend_of_errors::notify_frontend_of_errors;
use crate::core::commands::enqueue::generate_error::{GenerateError, MissingCredentialsReason};
use crate::core::commands::enqueue::task_enqueue_success::TaskEnqueueSuccess;
use crate::core::commands::response::failure_response_wrapper::CommandErrorStatus;
use crate::core::commands::response::shorthand::Response;
use crate::core::commands::response::success_response_wrapper::SerializeMarker;
use crate::core::events::basic_sendable_event_trait::BasicSendableEvent;
use crate::core::events::functional_events::credits_balance_changed_event::CreditsBalanceChangedEvent;
use crate::core::events::generation_events::common::GenerationModel;
use crate::core::events::generation_events::generation_enqueue_success_event::GenerationEnqueueSuccessEvent;
use crate::core::state::app_env_configs::app_env_configs::AppEnvConfigs;
use crate::core::state::artcraft_usage_tracker::artcraft_usage_tracker::ArtcraftUsageTracker;
use crate::core::state::artcraft_usage_tracker::artcraft_usage_type::{ArtcraftUsagePage, ArtcraftUsageType};
use crate::core::state::task_database::TaskDatabase;
use crate::services::storyteller::state::storyteller_credential_manager::StorytellerCredentialManager;
use artcraft_client::utils::basic_json_post_request::basic_json_post_request;
use enums::common::generation_provider::GenerationProvider;
use log::error;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Manager};
use uuid_utils::uuid::generate_random_uuid;

#[derive(Deserialize, Serialize)]
#[serde(transparent)]
pub struct OmniResponse(pub Value);

impl SerializeMarker for OmniResponse {}

pub type OmniResult = Response<OmniResponse, String, ()>;

pub async fn generate(request: OmniRequest, modality: Modality, app: &AppHandle) -> OmniResult {
  let configs = app.state::<AppEnvConfigs>();
  let manager = app.state::<StorytellerCredentialManager>();
  let maybe_creds = manager.get_credentials().map_err(local_error)?;
  let creds = match maybe_creds {
    Some(creds) => creds,
    None => {
      notify_frontend_of_errors(app, &GenerateError::MissingCredentials(MissingCredentialsReason::NeedsStorytellerCredentials)).await;
      return Err(command_error(CommandErrorStatus::Unauthorized, "needs_storyteller_credentials", "You need to be logged into ArtCraft.".into()));
    },
  };
  let mut fields = request.api_fields(modality);
  if modality == Modality::Image {
    resolve_image_inputs(&mut fields, Some(&creds), &configs.storyteller_host).await?;
  }
  fields.remove("estimate_only");
  if fields.get("idempotency_token").is_none_or(Value::is_null) {
    fields.insert("idempotency_token".into(), Value::String(generate_random_uuid()));
  }
  let model = fields.get("model").and_then(Value::as_str).map(str::to_owned);
  let route = format!("/v1/omni_gen/generate/{}", modality.as_str());
  let response: OmniResponse = match basic_json_post_request(&configs.storyteller_host, &route, Some(&creds), fields).await {
    Ok(response) => response,
    Err(err) => {
      let error = api_error(&err);
      notify_frontend_of_errors(app, &GenerateError::from(err)).await;
      return Err(error);
    },
  };

  // A batch may create several jobs. Track every job so history and completion
  // events survive restart, including when a model was unknown at build time.
  let job_tokens = job_tokens(&response.0);
  if job_tokens.is_empty() {
    return Err(local_error("The API accepted generation but returned no job tokens."));
  }
  record_usage(app, &request, modality, job_tokens.len());
  let database = app.state::<TaskDatabase>();
  for job_token in job_tokens {
    let success = TaskEnqueueSuccess { task_type: modality.task_type(), model: model.clone().map(GenerationModel::Unknown), provider: GenerationProvider::Artcraft, provider_job_id: Some(job_token), maybe_queue_status_url: None, maybe_queue_response_url: None, maybe_prompt_token: None };
    if let Err(err) = success.insert_into_task_database_with_frontend_payload(&database, request.frontend_caller, request.frontend_subscriber_id.as_deref(), request.frontend_subscriber_payload.as_deref()).await {
      // Generation has already been accepted. Do not encourage duplicate retries.
      error!("Could not persist accepted Omni generation: {:?}", err);
    }
    GenerationEnqueueSuccessEvent { action: success.to_frontend_event_action(), service: success.to_frontend_event_service(), model: success.model }.send_infallible(app);
  }
  CreditsBalanceChangedEvent {}.send_infallible(app);
  Ok(response.into())
}

pub async fn estimate(request: OmniRequest, modality: Modality, app: &AppHandle) -> OmniResult {
  let configs = app.state::<AppEnvConfigs>();
  let manager = app.state::<StorytellerCredentialManager>();
  let creds = manager.get_credentials().map_err(local_error)?;
  let mut fields = request.api_fields(modality);
  if modality == Modality::Image {
    // Pricing only needs reference presence, never upload a canvas on each keystroke.
    resolve_image_inputs(&mut fields, None, &configs.storyteller_host).await?;
  }
  let route = format!("/v1/omni_gen/cost/{}", modality.as_str());
  let response: OmniResponse = basic_json_post_request(&configs.storyteller_host, &route, creds.as_ref(), fields).await.map_err(|err| api_error(&err))?;
  Ok(response.into())
}

fn job_tokens(response: &Value) -> Vec<String> {
  let mut result = Vec::new();
  if let Some(primary) = response.get("inference_job_token").and_then(Value::as_str) {
    result.push(primary.to_owned());
  }
  if let Some(tokens) = response.get("all_job_tokens").and_then(Value::as_array) {
    for token in tokens.iter().filter_map(Value::as_str) {
      if !result.iter().any(|existing| existing == token) {
        result.push(token.to_owned());
      }
    }
  }
  result
}

fn record_usage(app: &AppHandle, request: &OmniRequest, modality: Modality, count: usize) {
  let tracker = app.state::<ArtcraftUsageTracker>();
  let count = u16::try_from(count).unwrap_or(u16::MAX);
  let has_media = request.fields.iter().any(|(key, value)| {
    key.ends_with("media_token") && value.is_string()
      || key.ends_with("media_tokens") && value.as_array().is_some_and(|values| !values.is_empty())
  });
  let usage = if has_media { ArtcraftUsageType::ImageToResult } else { ArtcraftUsageType::TextToResult };
  let result = match modality {
    Modality::Video => tracker.record_video_generation(count, usage, ArtcraftUsagePage::VideoPage),
    Modality::Mesh => tracker.record_object_generation(count, usage, ArtcraftUsagePage::ObjectPage),
    Modality::Splat => tracker.record_object_generation(count, usage, ArtcraftUsagePage::OtherPage),
    _ => Ok(()),
  };
  if let Err(err) = result {
    error!("Could not record generation usage: {:?}", err);
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;

  #[test]
  fn batch_tracks_each_job_once() {
    assert_eq!(job_tokens(&json!({"inference_job_token":"job_1", "all_job_tokens":["job_1", "job_2"]})), vec!["job_1", "job_2"]);
  }
}
