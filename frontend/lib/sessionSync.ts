export type AuthSyncEvent = { type: "login" | "logout" | "refresh" };

const CHANNEL_NAME = "voice-expense-auth";
const REFRESH_LOCK_KEY = "voice-expense:refresh-lock";
const REFRESH_LOCK_TTL_MS = 12_000;

function readRefreshLock() {
  try {
    const raw = localStorage.getItem(REFRESH_LOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expires: number };
    if (!parsed.expires || parsed.expires <= Date.now()) {
      localStorage.removeItem(REFRESH_LOCK_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function broadcastAuthEvent(type: AuthSyncEvent["type"]) {
  if (typeof window === "undefined") return;

  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type } satisfies AuthSyncEvent);
    channel.close();
  } catch {
    // BroadcastChannel unavailable — sessionStorage still syncs across tabs on same origin.
  }
}

export function subscribeAuthEvents(handler: (event: AuthSyncEvent) => void) {
  if (typeof window === "undefined") return () => {};

  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (message) => handler(message.data as AuthSyncEvent);
    return () => channel.close();
  } catch {
    return () => {};
  }
}

export async function withRefreshLock<T>(run: () => Promise<T>): Promise<T> {
  if (typeof window === "undefined") return run();

  const lockId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const started = Date.now();

  while (readRefreshLock()) {
    if (Date.now() - started > REFRESH_LOCK_TTL_MS) break;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  localStorage.setItem(
    REFRESH_LOCK_KEY,
    JSON.stringify({ id: lockId, expires: Date.now() + REFRESH_LOCK_TTL_MS }),
  );

  try {
    return await run();
  } finally {
    const current = readRefreshLock();
    if (current) localStorage.removeItem(REFRESH_LOCK_KEY);
  }
}
