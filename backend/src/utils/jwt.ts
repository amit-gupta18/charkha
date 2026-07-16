import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { isCrossOriginCookies } from "../config/cors";

type AuthTokenPayload = {
  userId: string;
  email: string;
};

function cookieSecure(request?: Request) {
  if (process.env.COOKIE_SECURE !== undefined) {
    return process.env.COOKIE_SECURE === "true";
  }

  const crossOrigin = isCrossOriginCookies();
  if (crossOrigin) return true;

  const forwardedProto = request?.headers["x-forwarded-proto"];
  if (typeof forwardedProto === "string") {
    return forwardedProto.split(",")[0]?.trim() === "https";
  }

  return request?.secure === true;
}

function cookieOptions(request?: Request) {
  const crossOrigin = isCrossOriginCookies();
  return {
    httpOnly: true,
    sameSite: crossOrigin ? ("none" as const) : ("lax" as const),
    secure: cookieSecure(request),
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

export function setAccessCookie(response: Response, token: string, request?: Request) {
  response.cookie(env.COOKIE_NAME, token, {
    ...cookieOptions(request),
    maxAge: env.ACCESS_COOKIE_MAX_AGE_MS,
  });
}

export function setRefreshCookie(response: Response, token: string, maxAgeMs: number, request?: Request) {
  response.cookie(env.REFRESH_COOKIE_NAME, token, {
    ...cookieOptions(request),
    maxAge: maxAgeMs,
  });
}

export function clearAccessCookie(response: Response, request?: Request) {
  response.clearCookie(env.COOKIE_NAME, cookieOptions(request));
}

export function clearRefreshCookie(response: Response, request?: Request) {
  response.clearCookie(env.REFRESH_COOKIE_NAME, cookieOptions(request));
}

/** Re-issue access JWT + cookie so active users stay logged in (sliding session). */
export function refreshAccessSession(response: Response, payload: AuthTokenPayload, request?: Request) {
  const token = signAuthToken(payload);
  setAccessCookie(response, token, request);
  return token;
}

/** @deprecated Use setAccessCookie */
export function setAuthCookie(response: Response, token: string, request?: Request) {
  setAccessCookie(response, token, request);
}

/** @deprecated Use clearAccessCookie */
export function clearAuthCookie(response: Response, request?: Request) {
  clearAccessCookie(response, request);
}

/** @deprecated Use refreshAccessSession */
export function refreshAuthSession(response: Response, payload: AuthTokenPayload, request?: Request) {
  return refreshAccessSession(response, payload, request);
}
