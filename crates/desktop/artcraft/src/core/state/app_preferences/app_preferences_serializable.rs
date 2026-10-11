use crate::core::state::app_preferences::app_preferences::AppPreferences;
use crate::core::state::app_preferences::preferred_download_directory::PreferredDownloadDirectory;
use crate::core::state::app_preferences::preferred_download_filename::PreferredDownloadFilename;
use crate::core::state::data_dir::app_data_root::AppDataRoot;
use errors::AnyhowResult;
use serde_derive::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppPreferencesSerializable {
  version: PreferencesVersion,
  
  /// The downloads directory to use when a user downloads a file.
  pub preferred_download_directory: PreferredDownloadDirectory,

  pub preferred_download_filename: PreferredDownloadFilename,

  pub auto_download: bool,

  /// Play sounds on events.
  pub play_sounds: bool,

  /// Key pointing to file; defined in the frontend code.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub delete_file_sound: Option<String>,

  /// Key pointing to file; defined in the frontend code.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub generation_success_sound: Option<String>,
  
  /// Key pointing to file; defined in the frontend code.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub generation_failure_sound: Option<String>,
  
}

#[derive(Debug, Clone, Serialize, Deserialize)]
enum PreferencesVersion {
  #[serde(rename = "3")]
  Current,
}

impl AppPreferencesSerializable {
  pub fn load_from_file(app_data_root: &AppDataRoot) -> AnyhowResult<Option<Self>> {
    let filename = app_data_root.settings_dir().get_app_preferences_path();
    if !filename.exists() {
      return Ok(None);
    }

    let contents = std::fs::read_to_string(filename)?;
    let data: Self = serde_json::from_str(&contents)?;
    Ok(Some(data))
  }

  pub fn from_preferences(preferences: &AppPreferences) -> Self {
    Self {
      version: PreferencesVersion::Current,
      preferred_download_directory: preferences.preferred_download_directory.clone(),
      preferred_download_filename: preferences.preferred_download_filename.clone(),
      auto_download: preferences.auto_download,
      play_sounds: preferences.play_sounds,
      delete_file_sound: preferences.delete_file_sound.clone(),
      generation_success_sound: preferences.generation_success_sound.clone(),
      generation_failure_sound: preferences.generation_failure_sound.clone(),
    }
  }

  pub fn to_preferences(&self) -> AppPreferences {
    AppPreferences {
      preferred_download_directory: self.preferred_download_directory.clone(),
      preferred_download_filename: self.preferred_download_filename.clone(),
      auto_download: self.auto_download,
      play_sounds: self.play_sounds,
      delete_file_sound: self.delete_file_sound.clone(),
      generation_success_sound: self.generation_success_sound.clone(),
      generation_failure_sound: self.generation_failure_sound.clone(),
      ..AppPreferences::default()
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn rejects_unsupported_preferences_without_rewriting_the_file() {
    let directory = tempfile::tempdir().unwrap();
    let data_root = AppDataRoot::create_existing(directory.path()).unwrap();
    let path = data_root.settings_dir().get_app_preferences_path();
    let mut value = serde_json::to_value(AppPreferences::default().to_serializable()).unwrap();
    value["version"] = serde_json::json!("2");
    let contents = serde_json::to_string(&value).unwrap();
    std::fs::write(&path, &contents).unwrap();
    assert!(AppPreferencesSerializable::load_from_file(&data_root).is_err());
    assert_eq!(std::fs::read_to_string(path).unwrap(), contents);
  }

  #[test]
  fn download_preferences_round_trip_without_changing_existing_fields() {
    let prefs = AppPreferences {
      auto_download: true,
      preferred_download_filename: PreferredDownloadFilename::Custom("{model}_{date}".into()),
      preferred_download_directory: PreferredDownloadDirectory::Custom("/my/downloads".into()),
      ..AppPreferences::default()
    };
    let json = serde_json::to_value(prefs.to_serializable()).unwrap();
    assert_eq!(json["auto_download"], true);
    assert_eq!(json["preferred_download_filename"]["custom_format"], "{model}_{date}");
    let restored = serde_json::from_value::<AppPreferencesSerializable>(json).unwrap().to_preferences();
    assert!(restored.auto_download);
    assert_eq!(restored.preferred_download_filename, prefs.preferred_download_filename);
    assert_eq!(restored.preferred_download_directory, prefs.preferred_download_directory);
    assert_eq!(restored.generation_success_sound, prefs.generation_success_sound);
  }
}
