import { Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

type AuthTokenPayload = {
  userId: string;
  email: string;
};

const cookieOptions = {
  httpOnly: true,
  path: "/",
  secure: false,
};

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}

export function setAccessCookie(response: Response, token: string) {
  response.cookie(env.COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: env.ACCESS_COOKIE_MAX_AGE_MS,
  });
}

export function setRefreshCookie(response: Response, token: string, maxAgeMs: number) {
  response.cookie(env.REFRESH_COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: maxAgeMs,
  });
}

export function clearAccessCookie(response: Response) {
  response.clearCookie(env.COOKIE_NAME, cookieOptions);
}

export function clearRefreshCookie(response: Response) {
  response.clearCookie(env.REFRESH_COOKIE_NAME, cookieOptions);
}

export function refreshAccessSession(response: Response, payload: AuthTokenPayload) {
  const token = signAuthToken(payload);
  setAccessCookie(response, token);
  return token;
}

/** @deprecated Use setAccessCookie */
export function setAuthCookie(response: Response, token: string) {
  setAccessCookie(response, token);
}

/** @deprecated Use clearAccessCookie */
export function clearAuthCookie(response: Response) {
  clearAccessCookie(response);
}

/** @deprecated Use refreshAccessSession */
export function refreshAuthSession(response: Response, payload: AuthTokenPayload) {
  return refreshAccessSession(response, payload);
}
