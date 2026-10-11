use midjourney_client::credentials::midjourney_user_id::MidjourneyUserId;
use midjourney_client::recipes::get_user_info::GetUserInfoResponse;

#[derive(Clone)]
pub struct MidjourneyUserInfo {
  pub user_id: Option<MidjourneyUserId>,
  pub email: Option<String>,
  pub websocket_token: Option<String>,
}

impl MidjourneyUserInfo {
  pub fn from_api_response(response: GetUserInfoResponse) -> Self {
    Self {
      user_id: response.user_id,
      email: response.email,
      websocket_token: response.websocket_token,
    }
  }
}
