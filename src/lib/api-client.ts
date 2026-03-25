/** Browser-only: optional Bearer token when `ADMIN_TOKEN` is set on the server. */
export const ADMIN_TOKEN_STORAGE_KEY = "vaxtrack_admin_token";

export function getStoredAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
}

export function setStoredAdminToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  else sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
}

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getStoredAdminToken();
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
