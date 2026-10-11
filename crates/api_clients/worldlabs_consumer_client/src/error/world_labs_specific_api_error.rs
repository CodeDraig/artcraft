use std::error::Error;
use std::fmt::{Display, Formatter};

#[derive(Debug)]
pub enum WorldLabsSpecificApiError {
  /// If the API drops run ids (unlikely)
  NoRunIdInResponse { response_body: String },

  /// The Google GCP upload failed because the signature does not match
  GoogleUploadSignatureDoesNotMatch,

  /// Grok is detecting and blocking our bot, likely due to new secrets use.
  AutomationBlocked,
  
  /// Too many videos are being generated.
  TooManyVideos,

  /// There aren't sufficient funds for generation.
  InsufficientCredits,

}

impl Error for WorldLabsSpecificApiError {}

impl Display for WorldLabsSpecificApiError {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    match self {
      Self::NoRunIdInResponse { response_body } => write!(f, "no run.id found in response: {}", response_body),
      Self::GoogleUploadSignatureDoesNotMatch => write!(f, "Google upload signature does not match"),
      Self::AutomationBlocked => write!(f, "Automation blocked"),
      Self::TooManyVideos => write!(f, "Too many videos are being generated"),
      Self::InsufficientCredits => write!(f, "Insufficient credits"),

    }
  }
}
