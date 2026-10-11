use crate::services::midjourney::state::midjourney_credential::{MidjourneyAccountInfo, MidjourneyCredential};
use base64::prelude::{Engine, BASE64_URL_SAFE_NO_PAD};
use serde_json::Value;

pub(super) const AUTH_ID: &str = "__Host-Midjourney.AuthUserTokenV3_i";

pub(super) fn populate_account_info(credential: &mut MidjourneyCredential) {
  let Some(claims) = credential.cookie.cookies.get_cookie_value(AUTH_ID).and_then(jwt_claims) else {
    return;
  };
  let info = credential.maybe_user_info.get_or_insert_with(MidjourneyAccountInfo::default);
  if let Some(id) = claims.get("midjourney_id").and_then(Value::as_str).filter(|id| !id.is_empty()) {
    info.maybe_user_id = Some(id.to_string());
  }
  if let Some(email) = claims.get("email").and_then(Value::as_str) {
    info.maybe_email = Some(email.to_string());
  }
}

pub(super) fn token_needs_refresh(maybe_token: Option<&str>, now: i64) -> bool {
  maybe_token.and_then(jwt_claims).and_then(|claims| claims.get("exp")?.as_i64()).is_none_or(|expires| expires <= now + 120)
}

fn jwt_claims(token: &str) -> Option<Value> {
  let payload = token.split('.').nth(1)?;
  serde_json::from_slice(&BASE64_URL_SAFE_NO_PAD.decode(payload).ok()?).ok()
}
