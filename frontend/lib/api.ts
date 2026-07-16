/** Calls the backend directly via NEXT_PUBLIC_API_URL (cross-origin, cookie auth). */
import { broadcastAuthEvent, withRefreshLock } from "@/lib/sessionSync";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const AUTH_NO_RETRY = ["/api/auth/login", "/api/auth/register", "/api/auth/logout"];

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let refreshPromise: Promise<boolean> | null = null;

function shouldRetryAuth(path: string) {
  return !AUTH_NO_RETRY.some((route) => path.startsWith(route));
}

async function tryRefreshSession() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = withRefreshLock(async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    }).catch(() => null);

    const ok = response?.ok ?? false;
    if (ok) broadcastAuthEvent("refresh");
    return ok;
  })
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function apiFetch<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (response.status === 401 && !retried && shouldRetryAuth(path)) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      return apiFetch<T>(path, init, true);
    }
    const { useAuthStore } = await import("@/stores/auth");
    useAuthStore.getState().handleSessionLost();
  }

  if (!response.ok) {
    throw new ApiError(data?.message ?? "Request failed.", response.status);
  }

  return data as T;
}

export async function refreshSession(): Promise<boolean> {
  return tryRefreshSession();
}
