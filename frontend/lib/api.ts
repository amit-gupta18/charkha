import { getRefreshToken } from "@/lib/auth-session";
import { broadcastAuthEvent, withRefreshLock } from "@/lib/sessionSync";
import type { RefreshResponse } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const AUTH_NO_RETRY = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/refresh",
];

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

async function buildAuthHeaders(init?: RequestInit) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  const { useAuthStore } = await import("@/stores/auth");
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = withRefreshLock(async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => null);

    if (!response?.ok) return false;

    const data = (await response.json()) as RefreshResponse;
    const { useAuthStore } = await import("@/stores/auth");
    useAuthStore.getState().updateAccess(data.user, data.accessToken);
    broadcastAuthEvent("refresh");
    return true;
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
    credentials: "omit",
    headers: await buildAuthHeaders(init),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (response.status === 401 && !retried && shouldRetryAuth(path)) {
    const refreshed = await refreshAccessToken();
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
