use crate::core::state::data_dir::app_data_root::AppDataRoot;
use errors::AnyhowResult;
use serde_derive::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs::OpenOptions;
use std::io::Write;
use std::sync::{Arc, RwLock};

#[derive(Copy, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Provider {
  Artcraft,
  Fal,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct ProviderPriority {
  /// Providers may occur zero or one time. 
  /// They are ordered by priority, highest to lowest.
  provider_priority: Vec<Provider>,
}

#[derive(Clone)]
pub struct ProviderPriorityStore {
  provider_priority: Arc<RwLock<ProviderPriority>>,
}

impl ProviderPriority {
  pub fn default() -> Self {
    Self {
      provider_priority: vec![
        Provider::Artcraft,
        Provider::Fal,
      ],
    }
  }
  
  pub fn set_priority(&mut self, ordered_list: &[Provider]) -> AnyhowResult<()> {
    let set : HashSet<&Provider> = HashSet::from_iter(ordered_list.iter());
    
    if set.len() != ordered_list.len() {
      return Err(anyhow::anyhow!("Duplicate providers in the ordered list"));
    }
    
    self.provider_priority = ordered_list.to_vec();
    Ok(())
  }
  
  pub fn get_priority(&self) -> &[Provider] {
    &self.provider_priority
  }

  pub fn from_filesystem_configs(app_data_root: &AppDataRoot) -> AnyhowResult<Option<Self>> {
    let filename = app_data_root.settings_dir().get_provider_preferences_path();
    if !filename.exists() {
      return Ok(None);
    }
    let contents = std::fs::read_to_string(filename)?;
    #[derive(Deserialize)]
    struct StoredPriority {
      provider_priority: Vec<String>,
    }
    let stored: StoredPriority = serde_json::from_str(&contents)?;
    // The file records user order; only providers available in this build can
    // participate. Reading never rewrites the saved preference file.
    let provider_priority = stored.provider_priority.into_iter()
      .filter_map(|provider| serde_json::from_value(serde_json::Value::String(provider)).ok())
      .collect();
    Ok(Some(Self { provider_priority }))
  }

  pub fn persist_to_filesystem(&self, app_data_root: &AppDataRoot) -> AnyhowResult<()> {
    let filename = app_data_root.settings_dir().get_provider_preferences_path();
    let json = serde_json::to_string(self)?;
    let mut file = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(filename)?;
    file.write_all(json.as_bytes())?;
    file.flush()?;
    Ok(())
  }
}

impl ProviderPriorityStore {
  pub fn default() -> Self {
    Self {
      provider_priority: Arc::new(RwLock::new(ProviderPriority::default())),
    }
  }

  pub fn set_priority(&self, ordered_list: &[Provider]) -> AnyhowResult<()> {
    match self.provider_priority.write() {
      Err(err) => {
        Err(anyhow::anyhow!("Failed to acquire write lock on provider priority: {}", err))
      }
      Ok(mut providers) => {
        providers.set_priority(ordered_list)?;
        Ok(())
      }
    }
  }

  pub fn get_priority(&self) -> AnyhowResult<Vec<Provider>> {
    match self.provider_priority.read() {
      Err(err) => {
        Err(anyhow::anyhow!("Failed to acquire read lock on provider priority: {}", err))
      }
      Ok(providers) => {
        Ok(providers.get_priority().to_vec())
      }
    }
  }

  pub fn from_filesystem_configs(app_data_root: &AppDataRoot) -> AnyhowResult<Option<Self>> {
    match ProviderPriority::from_filesystem_configs(app_data_root) {
      Err(err) => {
        Err(anyhow::anyhow!("Failed to read provider preferences from filesystem: {}", err))
      }
      Ok(None) => Ok(None),
      Ok(Some(providers)) => {
        Ok(Some(Self {
          provider_priority: Arc::new(RwLock::new(providers)),
        }))
      }
    }
  }

  pub fn persist_to_filesystem(&self, app_data_root: &AppDataRoot) -> AnyhowResult<()> {
    match self.provider_priority.read() {
      Err(err) => {
        Err(anyhow::anyhow!("Failed to acquire read lock on provider priority: {}", err))
      }
      Ok(providers) => {
        providers.persist_to_filesystem(app_data_root)?;
        Ok(())
      }
    }
  }
}


#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_default_priority() {
    let priority = ProviderPriority::default();
    assert_eq!(priority.get_priority(), &[Provider::Artcraft, Provider::Fal]);
  }

  #[test]
  fn unavailable_providers_do_not_discard_the_remaining_user_order() {
    let directory = tempfile::tempdir().unwrap();
    let root = AppDataRoot::create_existing(directory.path()).unwrap();
    let path = root.settings_dir().get_provider_preferences_path();
    let source = r#"{"provider_priority":["fal","unavailable_provider","artcraft"]}"#;
    std::fs::write(&path, source).unwrap();
    let priority = ProviderPriority::from_filesystem_configs(&root).unwrap().unwrap();
    assert_eq!(priority.get_priority(), &[Provider::Fal, Provider::Artcraft]);
    assert_eq!(std::fs::read_to_string(path).unwrap(), source);
  }

  #[test]
  fn test_set_priority() -> AnyhowResult<()> {
    let mut priority = ProviderPriority::default();
    priority.set_priority(&[Provider::Fal, Provider::Artcraft])?;
    assert_eq!(priority.get_priority(), &[Provider::Fal, Provider::Artcraft]);
    Ok(())
  }

  #[test]
  fn test_set_priority_with_duplicates() {
    let mut priority = ProviderPriority::default();
    let result = priority.set_priority(&[Provider::Artcraft, Provider::Artcraft]);
    assert!(result.is_err());
  }
}
