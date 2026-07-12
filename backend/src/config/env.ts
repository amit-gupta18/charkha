import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  MONGO_URI: requireEnv("MONGO_URI"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  PORT: Number(process.env.PORT ?? 8000),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  CORS_ALLOW_ALL: process.env.CORS_ORIGIN === "*" || process.env.CORS_ALLOW_ALL === "true",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "30d",
  COOKIE_NAME: process.env.COOKIE_NAME ?? "accessToken",
  /** When true, auth cookies use SameSite=None (direct cross-origin API). Leave false when using Next.js /api proxy. */
  COOKIE_CROSS_SITE: process.env.COOKIE_CROSS_SITE === "true",
  AUTH_COOKIE_MAX_AGE_MS: Number(process.env.AUTH_COOKIE_MAX_AGE_MS ?? 30 * 24 * 60 * 60 * 1000),
} as const;

export const isProduction = env.NODE_ENV === "production";
