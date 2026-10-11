use super::errors::local_error;
use crate::core::commands::generate::generate_image::utils::parse_semantic_media_files::{resolve_image_field, resolve_mask_field};
use crate::core::commands::response::failure_response_wrapper::CommandErrorResponseWrapper;
use artcraft_client::credentials::storyteller_credential_set::StorytellerCredentialSet;
use artcraft_client::utils::api_host::ApiHost;
use serde_json::{Map, Value};
use tokens::tokens::media_files::MediaFileToken;

pub(super) async fn resolve_image_inputs(fields: &mut Map<String, Value>, maybe_creds: Option<&StorytellerCredentialSet>, host: &ApiHost) -> Result<(), CommandErrorResponseWrapper<String, ()>> {
  let mut refs = Vec::new();
  for name in ["canvas_image", "scene_image", "inpainting_mask_image"] {
    let token_key = format!("{}_media_token", name);
    let bytes_key = format!("{}_raw_bytes", name);
    let token: Option<MediaFileToken> = serde_json::from_value(fields.remove(&token_key).unwrap_or(Value::Null)).map_err(local_error)?;
    let bytes: Option<Vec<u8>> = serde_json::from_value(fields.remove(&bytes_key).unwrap_or(Value::Null)).map_err(local_error)?;
    let resolved = if let Some(creds) = maybe_creds { if name == "inpainting_mask_image" { resolve_mask_field(token.as_ref(), bytes.as_deref(), creds, host).await } else { resolve_image_field(name, token.as_ref(), bytes.as_deref(), creds, host).await }.map_err(|err| local_error(format!("{:?}", err)))?.map(|token| token.to_string()) } else { token.map(|token| token.to_string()).or_else(|| bytes.map(|_| "mf_estimate_reference".into())) };
    if let Some(token) = resolved {
      if name == "inpainting_mask_image" {
        fields.insert(token_key, Value::String(token));
      } else {
        refs.push(Value::String(token));
      }
    }
  }
  if !refs.is_empty() {
    if let Some(Value::Array(existing)) = fields.remove("image_media_tokens") {
      refs.extend(existing);
    }
    fields.insert("image_media_tokens".into(), Value::Array(refs));
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;

  #[tokio::test]
  async fn pricing_keeps_reference_order_and_mask_separate_without_uploading() {
    let mut fields = json!({
      "canvas_image_raw_bytes": [1, 2, 3],
      "scene_image_media_token": "mf_scene",
      "inpainting_mask_image_raw_bytes": [4, 5],
      "image_media_tokens": ["mf_reference"]
    }).as_object().unwrap().clone();
    resolve_image_inputs(&mut fields, None, &ApiHost::Localhost { port: 0 }).await.unwrap();
    assert_eq!(fields["image_media_tokens"], json!(["mf_estimate_reference", "mf_scene", "mf_reference"]));
    assert_eq!(fields["inpainting_mask_image_media_token"], "mf_estimate_reference");
    assert!(!fields.contains_key("canvas_image_raw_bytes"));
    assert!(!fields.contains_key("scene_image_media_token"));
    assert!(!fields.contains_key("inpainting_mask_image_raw_bytes"));
  }

  #[tokio::test]
  async fn malformed_image_bytes_return_an_explicit_error() {
    let mut fields = json!({"canvas_image_raw_bytes": "not bytes"}).as_object().unwrap().clone();
    assert!(resolve_image_inputs(&mut fields, None, &ApiHost::Localhost { port: 0 }).await.is_err());
  }
}
