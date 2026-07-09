import type { CorsOptions } from "cors";
import { env } from "./env";

/** Allow all origins (cannot use origin: "*" with credentials — reflect request origin instead). */
export function corsOptions(): CorsOptions {
  if (env.CORS_ALLOW_ALL) {
    return {
      origin: (_origin, callback) => callback(null, true),
      credentials: true,
    };
  }

  return {
    origin: env.CORS_ORIGIN,
    credentials: true,
  };
}

export function isCrossOriginCookies() {
  return env.CORS_ALLOW_ALL || env.NODE_ENV === "production";
}
