use crate::core::commands::response::failure_response_wrapper::{CommandErrorResponseWrapper, CommandErrorStatus};
use artcraft_client::error::api_error::ApiError;
use artcraft_client::error::storyteller_error::StorytellerError;
use serde_json::Value;

pub fn local_error(err: impl std::fmt::Display) -> CommandErrorResponseWrapper<String, ()> {
  command_error(CommandErrorStatus::ServerError, "server_error", err.to_string())
}

pub(super) fn api_error(err: &StorytellerError) -> CommandErrorResponseWrapper<String, ()> {
  match err {
    StorytellerError::Api(ApiError::InvalidRequest(body)) => command_error(CommandErrorStatus::BadRequest, "bad_input", api_message(body)),
    StorytellerError::Api(ApiError::Unauthorized(body) | ApiError::Forbidden(body)) => command_error(CommandErrorStatus::Unauthorized, "unauthorized", api_message(body)),
    StorytellerError::Api(ApiError::TooManyRequests(body)) => command_error(CommandErrorStatus::TooManyRequests, "too_many_requests", api_message(body)),
    StorytellerError::Api(ApiError::PaymentRequired(body)) => command_error(CommandErrorStatus::BadRequest, "billing_issue", api_message(body)),
    _ => local_error(err),
  }
}

fn api_message(body: &str) -> String {
  serde_json::from_str::<Value>(body).ok().and_then(|value| value.get("error_message").or_else(|| value.get("message")).and_then(Value::as_str).map(str::to_owned)).unwrap_or_else(|| body.to_owned())
}

pub(super) fn command_error(status: CommandErrorStatus, kind: &str, message: String) -> CommandErrorResponseWrapper<String, ()> {
  CommandErrorResponseWrapper { status, error_type: Some(kind.into()), error_message: Some(message), error_details: None }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn invalid_options_return_the_api_message() {
    let err = api_error(&StorytellerError::Api(ApiError::InvalidRequest(r#"{"success":false,"error_message":"Duration must be between 4 and 30 seconds."}"#.into())));
    assert!(matches!(err.status, CommandErrorStatus::BadRequest));
    assert_eq!(err.error_message.as_deref(), Some("Duration must be between 4 and 30 seconds."));
  }
}
