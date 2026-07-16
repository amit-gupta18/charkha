const REFRESH_TOKEN_KEY = "refreshToken";

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearRefreshToken() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}
