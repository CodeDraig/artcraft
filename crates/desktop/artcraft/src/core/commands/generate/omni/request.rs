use enums::common::generation_provider::GenerationProvider;
use enums::tauri::tasks::task_type::TaskType;
use enums::tauri::ux::tauri_command_caller::TauriCommandCaller;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

/// Desktop metadata is local. Everything else is an API-owned field, including
/// model IDs and option strings introduced after this version of the app.
#[derive(Clone, Deserialize, Serialize)]
pub struct OmniRequest {
  pub provider: Option<GenerationProvider>,
  pub frontend_caller: Option<TauriCommandCaller>,
  pub frontend_subscriber_id: Option<String>,
  pub frontend_subscriber_payload: Option<String>,
  #[serde(flatten)]
  pub fields: Map<String, Value>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Modality {
  Image,
  Video,
  Mesh,
  Splat,
  Audio,
}

impl OmniRequest {
  pub fn uses_artcraft(&self) -> bool {
    // Grok generation is routed through Artcraft.
    self.model().is_some_and(|model| model.starts_with("grok_")) || matches!(self.provider, None | Some(GenerationProvider::Artcraft | GenerationProvider::Grok))
  }

  pub fn model(&self) -> Option<&str> {
    self.fields.get("model").and_then(Value::as_str)
  }

  pub fn api_fields(&self, modality: Modality) -> Map<String, Value> {
    let mut fields = self.fields.clone();
    match modality {
      Modality::Image => rename_field(&mut fields, "batch_size", "image_batch_count"),
      Modality::Video => {
        rename_field(&mut fields, "image_media_token", "start_frame_image_media_token");
        fields.remove("grok_aspect_ratio");
      },
      Modality::Splat => rename_field(&mut fields, "image_media_tokens", "reference_image_media_tokens"),
      Modality::Mesh => {
        if let Some(token) = fields.remove("image_media_token").filter(|v| !v.is_null()) {
          fields.entry("reference_image_media_tokens").or_insert(Value::Array(vec![token]));
        }
      },
      Modality::Audio => {},
    }
    // These belong to the old pricing endpoint, not Omni generation or pricing.
    fields.remove("generation_mode");
    fields
  }
}

impl Modality {
  pub fn as_str(self) -> &'static str {
    match self {
      Self::Image => "image",
      Self::Video => "video",
      Self::Mesh => "mesh",
      Self::Splat => "splat",
      Self::Audio => "audio",
    }
  }

  pub fn task_type(self) -> TaskType {
    match self {
      Self::Image => TaskType::ImageGeneration,
      Self::Video => TaskType::VideoGeneration,
      Self::Mesh => TaskType::ObjectGeneration,
      Self::Splat => TaskType::GaussianGeneration,
      Self::Audio => TaskType::AudioGeneration,
    }
  }
}

fn rename_field(fields: &mut Map<String, Value>, old: &str, new: &str) {
  if let Some(value) = fields.remove(old).filter(|v| !v.is_null()) {
    if fields.get(new).is_none_or(Value::is_null) {
      fields.insert(new.into(), value);
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;

  #[test]
  fn catalog_parity_new_models_and_options_reach_the_api_unchanged() {
    for model in ["gpt_image_2p5_flare", "gpt_image_2p5_sunburst"] {
      for quality in ["auto", "max", "xhigh", "high", "medium", "low"] {
        let source = json!({"model": model, "quality": quality, "resolution": "four_k"});
        let request: OmniRequest = serde_json::from_value(source.clone()).unwrap();
        assert!(request.uses_artcraft());
        assert_eq!(Value::Object(request.api_fields(Modality::Image)), source);
      }
    }
    for model in ["wan_3p0", "wan_3p0_prime", "seedance_2p5", "seedance_2p5_u"] {
      let source = json!({
        "model": model, "duration_seconds": 15, "resolution": "ten_eighty_p",
        "output_format": "mov", "generate_audio": true,
        "reference_image_media_tokens": ["mf_image"],
        "reference_video_media_tokens": ["mf_video"],
        "reference_audio_media_tokens": ["mf_audio"]
      });
      let request: OmniRequest = serde_json::from_value(source.clone()).unwrap();
      assert!(request.uses_artcraft());
      assert_eq!(Value::Object(request.api_fields(Modality::Video)), source);
    }
  }

  #[test]
  fn future_model_and_options_survive_without_desktop_metadata() {
    let request: OmniRequest = serde_json::from_value(json!({
      "model": "future_video_v9", "resolution": "eight_k", "bitrate": "ultra",
      "duration_seconds": 30, "generate_audio": false, "new_option": {"value": 1},
      "estimate_only": {"total_input_video_duration_millis": 7250},
      "frontend_subscriber_id": "local-only"
    }))
    .unwrap();
    let fields = request.api_fields(Modality::Video);
    assert_eq!(fields["model"], "future_video_v9");
    assert_eq!(fields["resolution"], "eight_k");
    assert_eq!(fields["bitrate"], "ultra");
    assert_eq!(fields["duration_seconds"], 30);
    assert_eq!(fields["generate_audio"], false);
    assert_eq!(fields["new_option"]["value"], 1);
    assert_eq!(fields["estimate_only"]["total_input_video_duration_millis"], 7250);
    assert!(!fields.contains_key("frontend_subscriber_id"));
    assert!(!fields.contains_key("provider"));
  }

  #[test]
  fn grok_uses_artcraft_even_with_a_saved_native_provider() {
    let request: OmniRequest = serde_json::from_value(json!({
      "model": "grok_imagine_video", "provider": "grok"
    }))
    .unwrap();
    assert!(request.uses_artcraft());
    assert_eq!(request.api_fields(Modality::Video)["model"], "grok_imagine_video");
  }

  #[test]
  fn native_mesh_and_splat_inputs_use_omni_field_names() {
    let mesh: OmniRequest = serde_json::from_value(json!({
      "model": "hunyuan_3d_2p0", "image_media_token": "mf_mesh_input"
    }))
    .unwrap();
    let fields = mesh.api_fields(Modality::Mesh);
    assert_eq!(fields["model"], "hunyuan_3d_2p0");
    assert_eq!(fields["reference_image_media_tokens"], json!(["mf_mesh_input"]));
    assert!(!fields.contains_key("image_media_token"));

    let splat: OmniRequest = serde_json::from_value(json!({
      "model": "marble_0p1_plus", "image_media_tokens": ["mf_splat_input"]
    }))
    .unwrap();
    let fields = splat.api_fields(Modality::Splat);
    assert_eq!(fields["model"], "marble_0p1_plus");
    assert_eq!(fields["reference_image_media_tokens"], json!(["mf_splat_input"]));
  }

  #[test]
  fn future_model_ids_survive_storage_and_event_serialization() {
    use crate::core::events::generation_events::common::GenerationModel;
    use enums::tauri::tasks::task_model_type::TaskModelType;

    let stored = TaskModelType::from_str("future_model_v99").unwrap();
    let event = GenerationModel::Unknown(stored.to_str().to_owned());
    assert_eq!(serde_json::to_value(event).unwrap(), json!("future_model_v99"));
    // Persisted event identity remains distinct from the API model ID.
    assert_eq!(serde_json::to_value(GenerationModel::FluxPro11).unwrap(), json!("flux_pro_1.1"));
  }
}

#[cfg(test)]
mod midjourney_tests {
  use super::*;

  #[test]
  fn versioned_models_respect_the_explicit_provider() {
    for model in ["midjourney_7", "midjourney_7_niji", "midjourney_8"] {
      let direct: OmniRequest = serde_json::from_value(serde_json::json!({"model": model, "provider": "midjourney"})).unwrap();
      assert!(!direct.uses_artcraft());
      let artcraft: OmniRequest = serde_json::from_value(serde_json::json!({"model": model, "provider": "artcraft"})).unwrap();
      assert!(artcraft.uses_artcraft());
      assert_eq!(artcraft.api_fields(Modality::Image)["model"], model);
    }
  }


}
