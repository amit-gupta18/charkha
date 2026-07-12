import { Response } from "express";
import jwt from "jsonwebtoken";
import { env, isProduction } from "../config/env";
import { isCrossOriginCookies } from "../config/cors";

type AuthTokenPayload = {
  userId: string;
  email: string;
};

function cookieOptions() {
  const crossOrigin = isCrossOriginCookies();
  return {
    httpOnly: true,
    sameSite: crossOrigin ? ("none" as const) : ("lax" as const),
    secure: crossOrigin || isProduction,
    path: "/",
  };
}

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}

export function setAuthCookie(response: Response, token: string) {
  response.cookie(env.COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: env.AUTH_COOKIE_MAX_AGE_MS,
  });
}

export function clearAuthCookie(response: Response) {
  response.clearCookie(env.COOKIE_NAME, cookieOptions());
}

/** Re-issue JWT + cookie so active users stay logged in (sliding session). */
export function refreshAuthSession(response: Response, payload: AuthTokenPayload) {
  const token = signAuthToken(payload);
  setAuthCookie(response, token);
  return token;
}
