export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate GitHub OAuth login URL
export const getLoginUrl = () => {
  const clientId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri); // Encode redirect URI as state

  if (!clientId) {
    throw new Error("VITE_APP_ID (GitHub Client ID) is not configured");
  }

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "user:email");
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "true");

  return url.toString();
};
