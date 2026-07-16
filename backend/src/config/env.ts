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
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "15m",
  COOKIE_NAME: process.env.COOKIE_NAME ?? "accessToken",
  REFRESH_COOKIE_NAME: process.env.REFRESH_COOKIE_NAME ?? "refreshToken",
  ACCESS_COOKIE_MAX_AGE_MS: Number(process.env.ACCESS_COOKIE_MAX_AGE_MS ?? 60 * 60 * 1000),
  REFRESH_TOKEN_MAX_AGE_MS: Number(process.env.REFRESH_TOKEN_MAX_AGE_MS ?? 7 * 24 * 60 * 60 * 1000),
  /** @deprecated Use ACCESS_COOKIE_MAX_AGE_MS */
  AUTH_COOKIE_MAX_AGE_MS: Number(process.env.AUTH_COOKIE_MAX_AGE_MS ?? 60 * 60 * 1000),
} as const;

export const isProduction = env.NODE_ENV === "production";
