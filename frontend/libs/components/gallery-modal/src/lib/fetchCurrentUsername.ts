import { UsersApi } from "@storyteller/api";

const usersApiSingleton = new UsersApi();
/** Fetch the current session's username fresh every time — the session may have changed (logout/login). */
export async function fetchCurrentUsername(): Promise<string | null> {
  try {
    const session = await usersApiSingleton.GetSession();
    if (session.success && session.data?.user) {
      return session.data.user.username;
    }
  } catch {
    // ignore
  }
  return null;
}
