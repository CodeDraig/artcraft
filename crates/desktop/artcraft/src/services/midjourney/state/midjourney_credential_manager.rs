use crate::core::state::data_dir::app_data_root::AppDataRoot;
use crate::services::midjourney::state::midjourney_credential::{MidjourneyAccountInfo, MidjourneyCredential};
use crate::services::midjourney::state::midjourney_user_info::MidjourneyUserInfo;
use crate::services::midjourney::state::midjourney_token::{populate_account_info, token_needs_refresh, AUTH_ID};
use crate::services::midjourney::utils::extract_midjourney_user_id_from_cookies::extract_midjourney_user_id_from_cookie_header;
use anyhow::{anyhow, bail};
use browser_emulation::browser_profile::BrowserProfile;
use chrono::Utc;
use cookie_store_wrapper::cookie_store::CookieStore;
use midjourney_client::credentials::cookie_store_has_auth_cookies::cookie_store_has_auth_cookies;
use midjourney_client::credentials::midjourney_user_id::MidjourneyUserId;
use midjourney_client::endpoints::refresh_token::{refresh_token, RefreshTokenArgs, RefreshTokenRequest, DEFAULT_FIREBASE_API_KEY};
use midjourney_client::error::midjourney_api_error::MidjourneyApiError;
use midjourney_client::error::midjourney_error::MidjourneyError;
use midjourney_client::recipes::get_user_info::{get_user_info, GetUserInfoArgs};
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tokio::sync::Mutex;
use url::Url;

const AUTH_REFRESH: &str = "__Host-Midjourney.AuthUserTokenV3_r";
const MIDJOURNEY_ORIGIN: &str = "https://www.midjourney.com/";

#[derive(Clone)]
pub struct MidjourneyCredentialManager {
  credential: Arc<RwLock<Option<MidjourneyCredential>>>,
  // Serialize refresh, login, and logout so an old refresh cannot resurrect a
  // signed-out session or overwrite credentials captured by a new login.
  mutation: Arc<Mutex<()>>,
  app_data_root: AppDataRoot,
}

pub struct MidjourneySession {
  pub credential_id: String,
  pub cookie_header: String,
  pub user_id: MidjourneyUserId,
  pub browser: BrowserProfile,
}

impl MidjourneyCredentialManager {
  pub fn initialize_empty(app_data_root: &AppDataRoot) -> Self {
    Self { credential: Arc::new(RwLock::new(None)), mutation: Arc::new(Mutex::new(())), app_data_root: app_data_root.clone() }
  }

  pub fn initialize_from_disk_infallible(app_data_root: &AppDataRoot) -> Self {
    let manager = Self::initialize_empty(app_data_root);
    match load_credential(app_data_root) {
      Ok(credential) => {
        if let Ok(mut current) = manager.credential.write() {
          *current = credential;
        }
      },
      Err(err) => log::warn!("Could not load Midjourney credentials: {}", err),
    }
    manager
  }

  pub fn maybe_copy_cookie_store(&self) -> anyhow::Result<Option<CookieStore>> {
    Ok(self.snapshot()?.map(|credential| credential.cookie.cookies))
  }

  pub fn maybe_copy_user_info(&self) -> anyhow::Result<Option<MidjourneyUserInfo>> {
    Ok(self.snapshot()?.and_then(|credential| credential.maybe_user_info).map(|info| MidjourneyUserInfo { user_id: info.maybe_user_id.map(MidjourneyUserId::from_string), email: info.maybe_email, websocket_token: None }))
  }

  pub fn session_appears_active(&self) -> anyhow::Result<bool> {
    Ok(self.snapshot()?.is_some_and(|credential| credential.cookie.maybe_relogin_required_since.is_none() && (cookie_store_has_auth_cookies(&credential.cookie.cookies) || !token_needs_refresh(credential.cookie.cookies.get_cookie_value(AUTH_ID), Utc::now().timestamp()))))
  }

  pub async fn save_login(&self, cookies: CookieStore) -> anyhow::Result<()> {
    let _guard = self.mutation.lock().await;
    let mut credential = MidjourneyCredential::new(cookies);
    populate_account_info(&mut credential);
    self.store(credential)
  }

  pub async fn clear_credentials(&self) -> anyhow::Result<()> {
    let _guard = self.mutation.lock().await;
    match std::fs::remove_file(self.credential_path()) {
      Ok(()) => {},
      Err(err) if err.kind() == std::io::ErrorKind::NotFound => {},
      Err(err) => return Err(err.into()),
    }
    *self.credential.write().map_err(|_| anyhow!("Midjourney credential lock poisoned"))? = None;
    Ok(())
  }

  /// Resolve identity and renew expiring Firebase credentials before sending
  /// generation or polling requests. The refresh token can outlive the ID JWT.
  pub async fn session(&self) -> anyhow::Result<Option<MidjourneySession>> {
    let _guard = self.mutation.lock().await;
    let Some(mut credential) = self.snapshot()? else {
      return Ok(None);
    };
    if credential.cookie.maybe_relogin_required_since.is_some() {
      return Ok(None);
    }
    if token_needs_refresh(credential.cookie.cookies.get_cookie_value(AUTH_ID), Utc::now().timestamp()) {
      let Some(refresh) = credential.cookie.cookies.get_cookie_value(AUTH_REFRESH).map(str::to_owned) else {
        self.mark_relogin(&mut credential)?;
        return Ok(None);
      };
      let refreshed = tokio::time::timeout(Duration::from_secs(30), refresh_token(RefreshTokenArgs { request: RefreshTokenRequest { refresh_token: &refresh, api_key: DEFAULT_FIREBASE_API_KEY }, browser: Some(credential.browser()) })).await?;
      match refreshed {
        Ok(response) => {
          let origin = Url::parse(MIDJOURNEY_ORIGIN)?;
          // Preserve the host-only Secure scope required by __Host- cookies.
          for (name, value) in [(AUTH_ID, response.id_token), (AUTH_REFRESH, response.refresh_token)] {
            credential.cookie.cookies.apply_set_cookie_header(&format!("{name}={value}; Path=/; Secure; HttpOnly"), &origin);
          }
          credential.cookie.maybe_updated_at = Some(Utc::now());
          credential.cookie.maybe_succeeded_at = Some(Utc::now());
          populate_account_info(&mut credential);
          self.store(credential.clone())?;
        },
        Err(err) if is_revoked_refresh(&err) => {
          self.mark_relogin(&mut credential)?;
          return Ok(None);
        },
        Err(err) => {
          credential.cookie.maybe_failed_at = Some(Utc::now());
          self.store(credential)?;
          return Err(err.into());
        },
      }
    }
    populate_account_info(&mut credential);
    let cookie_header = credential.cookie.cookies.cookie_header_for_url(&Url::parse(MIDJOURNEY_ORIGIN)?).unwrap_or_default();
    let browser = credential.browser();
    let mut maybe_user_id = extract_midjourney_user_id_from_cookie_header(&cookie_header).or_else(|| credential.maybe_user_info.as_ref()?.maybe_user_id.as_deref().map(MidjourneyUserId::from_str));
    if maybe_user_id.is_none() {
      let info = tokio::time::timeout(Duration::from_secs(30), get_user_info(GetUserInfoArgs { cookie_header: &cookie_header, hostname: None, browser: Some(browser.clone()) })).await??;
      maybe_user_id = info.user_id;
      credential.maybe_user_info = Some(MidjourneyAccountInfo { maybe_user_id: maybe_user_id.as_ref().map(|id| id.as_str().to_string()), maybe_email: info.email, maybe_username: None });
      self.store(credential.clone())?;
    }
    let Some(user_id) = maybe_user_id else {
      bail!("Could not resolve the Midjourney account; please log in again")
    };
    Ok(Some(MidjourneySession { credential_id: credential.id, cookie_header, user_id, browser }))
  }

  fn snapshot(&self) -> anyhow::Result<Option<MidjourneyCredential>> {
    Ok(self.credential.read().map_err(|_| anyhow!("Midjourney credential lock poisoned"))?.clone())
  }

  fn store(&self, credential: MidjourneyCredential) -> anyhow::Result<()> {
    credential.save(&self.credential_path())?;
    *self.credential.write().map_err(|_| anyhow!("Midjourney credential lock poisoned"))? = Some(credential);
    Ok(())
  }

  fn mark_relogin(&self, credential: &mut MidjourneyCredential) -> anyhow::Result<()> {
    let now = Utc::now();
    credential.cookie.maybe_failed_at = Some(now);
    credential.cookie.maybe_relogin_required_since.get_or_insert(now);
    self.store(credential.clone())
  }

  fn credential_path(&self) -> std::path::PathBuf {
    self.app_data_root.credentials_dir().get_midjourney_credential_path()
  }
}

fn load_credential(root: &AppDataRoot) -> anyhow::Result<Option<MidjourneyCredential>> {
  let path = root.credentials_dir().get_midjourney_credential_path();
  if path.exists() {
    let credential = MidjourneyCredential::load(&path)?;
    credential.save(&path)?; // Persist a stable ID for hand-written files.
    return Ok(Some(credential));
  }
  Ok(None)
}

fn is_revoked_refresh(error: &MidjourneyError) -> bool {
  let MidjourneyError::Api(MidjourneyApiError::InvalidRequest(body) | MidjourneyApiError::Unauthorized(body)) = error else {
    return false;
  };
  ["TOKEN_EXPIRED", "INVALID_REFRESH_TOKEN", "USER_DISABLED", "USER_NOT_FOUND"].iter().any(|code| body.contains(code))
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::core::state::data_dir::trait_data_subdir::DataSubdir;
  use tempfile::TempDir;
  use base64::prelude::{Engine, BASE64_URL_SAFE_NO_PAD};

  const TEST_USER_ID: &str = "00000000-0000-4000-8000-000000000001";

  mod persistence {
    use super::*;

    #[tokio::test]
    async fn login_round_trips_and_logout_preserves_unrelated_files() {
      let (_dir, root) = root();
      let obsolete = root.credentials_dir().path().join("midjourney_state.json");
      let artcraft = root.credentials_dir().get_storyteller_session_cookie_file_path();
      std::fs::write(&artcraft, "existing-artcraft-session").unwrap();
      std::fs::write(&obsolete, "obsolete credentials").unwrap();
      let manager = MidjourneyCredentialManager::initialize_from_disk_infallible(&root);
      assert!(manager.session().await.unwrap().is_none());
      manager.save_login(cookies(Utc::now().timestamp() + 3600)).await.unwrap();
      let session = manager.session().await.unwrap().unwrap();
      assert_eq!(session.user_id.as_str(), TEST_USER_ID);
      let reloaded = MidjourneyCredentialManager::initialize_from_disk_infallible(&root);
      assert_eq!(reloaded.session().await.unwrap().unwrap().credential_id, session.credential_id);
      manager.clear_credentials().await.unwrap();
      assert!(!root.credentials_dir().get_midjourney_credential_path().exists());
      assert_eq!(std::fs::read_to_string(artcraft).unwrap(), "existing-artcraft-session");
      assert_eq!(std::fs::read_to_string(obsolete).unwrap(), "obsolete credentials");
      let reloaded = MidjourneyCredentialManager::initialize_from_disk_infallible(&root);
      assert!(reloaded.session().await.unwrap().is_none());
    }

    #[tokio::test]
    async fn expired_session_without_refresh_requires_login_and_new_login_clears_it() {
      let (_dir, root) = root();
      let manager = MidjourneyCredentialManager::initialize_empty(&root);
      manager.save_login(cookies(10)).await.unwrap();
      assert!(manager.session().await.unwrap().is_none());
      assert!(!manager.session_appears_active().unwrap());
      let dead = MidjourneyCredential::load(&root.credentials_dir().get_midjourney_credential_path()).unwrap();
      assert!(dead.cookie.maybe_relogin_required_since.is_some());
      manager.save_login(cookies(Utc::now().timestamp() + 3600)).await.unwrap();
      assert!(manager.session().await.unwrap().is_some());
      assert!(manager.session_appears_active().unwrap());
      assert!(manager.snapshot().unwrap().unwrap().cookie.maybe_relogin_required_since.is_none());
    }

    #[test]
    fn cookie_attributes_and_user_agent_survive_toml_round_trip() {
      let (_dir, root) = root();
      let origin = Url::parse(MIDJOURNEY_ORIGIN).unwrap();
      let mut cookies = CookieStore::empty();
      cookies.apply_set_cookie_header("session=host; Path=/; Secure; HttpOnly; SameSite=Lax", &origin);
      cookies.apply_set_cookie_header("session=domain; Domain=midjourney.com; Path=/api; Secure", &origin);
      let credential = MidjourneyCredential::new(cookies);
      let path = root.credentials_dir().get_midjourney_credential_path();
      credential.save(&path).unwrap();
      let loaded = MidjourneyCredential::load(&path).unwrap();
      assert_eq!(loaded.cookie.cookies, credential.cookie.cookies);
      assert_eq!(loaded.browser(), credential.browser());
      assert_eq!(loaded.cookie.cookies.cookie_header_for_url(&origin).as_deref(), Some("session=host"));
      assert!(loaded.cookie.cookies.cookie_header_for_url(&Url::parse("http://www.midjourney.com/").unwrap()).is_none());
      assert_eq!(loaded.cookie.cookies.cookie_header_for_url(&Url::parse("https://midjourney.com/api/test").unwrap()).as_deref(), Some("session=domain"));
      #[cfg(unix)]
      {
        use std::os::unix::fs::PermissionsExt;
        assert_eq!(std::fs::metadata(path).unwrap().permissions().mode() & 0o777, 0o600);
      }
    }

    #[test]
    fn corrupt_credential_is_an_error() {
      let (_dir, root) = root();
      std::fs::write(root.credentials_dir().get_midjourney_credential_path(), "not valid toml").unwrap();
      assert!(load_credential(&root).is_err());
    }
  }

  mod refresh {
    use super::*;

    #[test]
    fn refreshes_before_expiry_but_does_not_refresh_a_fresh_token() {
      assert!(!token_needs_refresh(Some(&token(5000)), 1000));
      assert!(token_needs_refresh(Some(&token(1120)), 1000));
      assert!(token_needs_refresh(Some(&token(999)), 1000));
      assert!(token_needs_refresh(Some("invalid"), 1000));
      assert!(token_needs_refresh(None, 1000));
    }

    #[test]
    fn temporary_refresh_failures_do_not_force_logout() {
      assert!(!is_revoked_refresh(&MidjourneyApiError::NetworkError("offline".into()).into()));
      assert!(!is_revoked_refresh(&MidjourneyApiError::InvalidRequest("API_KEY_INVALID".into()).into()));
      assert!(is_revoked_refresh(&MidjourneyApiError::InvalidRequest("INVALID_REFRESH_TOKEN".into()).into()));
    }
  }

  fn root() -> (TempDir, AppDataRoot) {
    let dir = tempfile::tempdir().unwrap();
    let root = AppDataRoot::create_existing(dir.path()).unwrap();
    assert!(root.credentials_dir().path().exists());
    (dir, root)
  }

  fn cookies(exp: i64) -> CookieStore {
    CookieStore::from_cookie_header(&format!("{AUTH_ID}={}", token(exp)), &Url::parse(MIDJOURNEY_ORIGIN).unwrap())
  }

  fn token(exp: i64) -> String {
    let claims = serde_json::json!({"exp": exp, "midjourney_id": TEST_USER_ID});
    format!("header.{}.signature", BASE64_URL_SAFE_NO_PAD.encode(claims.to_string()))
  }
}
