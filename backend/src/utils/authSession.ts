import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models/User";
import {
  clearAccessCookie,
  clearRefreshCookie,
  refreshAccessSession,
  setAccessCookie,
  signAuthToken,
  verifyAuthToken,
} from "./jwt";
import { createRefreshToken, revokeRefreshToken, validateRefreshToken } from "./refreshToken";

export type SessionUser = {
  userId: string;
  email: string;
};

function readAccessToken(request: Request) {
  return request.cookies?.[env.COOKIE_NAME] as string | undefined;
}

function readRefreshToken(request: Request) {
  return request.cookies?.[env.REFRESH_COOKIE_NAME] as string | undefined;
}

function isExpiredTokenError(error: unknown) {
  return error instanceof jwt.TokenExpiredError;
}

async function issueSession(response: Response, userId: string, email: string) {
  const token = signAuthToken({ userId, email });
  setAccessCookie(response, token);
  return { userId, email };
}

export async function establishSession(response: Response, userId: string, email: string) {
  await issueSession(response, userId, email);
  await createRefreshToken(userId, response);
}

export async function resolveSession(request: Request, response: Response): Promise<SessionUser | null> {
  const accessToken = readAccessToken(request);

  if (accessToken) {
    try {
      const payload = verifyAuthToken(accessToken);
      refreshAccessSession(response, payload);
      return payload;
    } catch (error) {
      if (!isExpiredTokenError(error)) {
        clearAccessCookie(response);
        return null;
      }
    }
  }

  const refreshRaw = readRefreshToken(request);
  if (!refreshRaw) {
    clearAccessCookie(response);
    return null;
  }

  const userId = await validateRefreshToken(refreshRaw);
  if (!userId) {
    clearAccessCookie(response);
    clearRefreshCookie(response);
    return null;
  }

  const user = await User.findById(userId);
  if (!user) {
    await revokeRefreshToken(refreshRaw);
    clearAccessCookie(response);
    clearRefreshCookie(response);
    return null;
  }

  return issueSession(response, String(user._id), user.email);
}

export async function clearSession(request: Request, response: Response) {
  await revokeRefreshToken(readRefreshToken(request));
  clearAccessCookie(response);
  clearRefreshCookie(response);
}
