import type { CorsOptions } from "cors";

/** Allow any origin with credentials (reflects request Origin — * is invalid with cookies). */
export function corsOptions(): CorsOptions {
  return {
    origin: (_origin, callback) => callback(null, true),
    credentials: true,
  };
}
