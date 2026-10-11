use std::error::Error;
use std::fmt::{Display, Formatter};

#[derive(Debug)]
pub enum GrokSpecificApiError {
  /// Grok is detecting and blocking our bot, likely due to new secrets use.
  AutomationBlocked,
  
  /// Too many videos are being generated.
  TooManyVideos,
  

}

impl Error for GrokSpecificApiError {}

impl Display for GrokSpecificApiError {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    match self {
      Self::AutomationBlocked => write!(f, "Automation blocked"),
      Self::TooManyVideos => write!(f, "Too many videos are being generated"),

    }
  }
}
