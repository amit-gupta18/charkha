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
  CORS_ORIGIN: requireEnv("CORS_ORIGIN", "http://localhost:3000"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",
  COOKIE_NAME: process.env.COOKIE_NAME ?? "accessToken",
} as const;

export const isProduction = env.NODE_ENV === "production";
