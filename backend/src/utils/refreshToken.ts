import crypto from "crypto";
import { Request, Response } from "express";
import { env } from "../config/env";
import { RefreshToken } from "../models/RefreshToken";
import { setRefreshCookie, clearRefreshCookie } from "./jwt";

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function createRefreshToken(userId: string, response: Response, request?: Request) {
  const raw = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_MAX_AGE_MS);

  await RefreshToken.create({
    userId,
    tokenHash: hashToken(raw),
    expiresAt,
  });

  setRefreshCookie(response, raw, env.REFRESH_TOKEN_MAX_AGE_MS, request);
  return raw;
}

/** Validate refresh token without rotating — safe for concurrent tabs. */
export async function validateRefreshToken(raw: string) {
  const tokenHash = hashToken(raw);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing || existing.expiresAt.getTime() <= Date.now()) {
    if (existing) await RefreshToken.deleteOne({ _id: existing._id });
    return null;
  }

  return String(existing.userId);
}

export async function rotateRefreshToken(raw: string, response: Response, request?: Request) {
  const tokenHash = hashToken(raw);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing || existing.expiresAt.getTime() <= Date.now()) {
    if (existing) await RefreshToken.deleteOne({ _id: existing._id });
    clearRefreshCookie(response, request);
    return null;
  }

  await RefreshToken.deleteOne({ _id: existing._id });

  const newRaw = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_MAX_AGE_MS);

  await RefreshToken.create({
    userId: existing.userId,
    tokenHash: hashToken(newRaw),
    expiresAt,
  });

  setRefreshCookie(response, newRaw, env.REFRESH_TOKEN_MAX_AGE_MS, request);
  return String(existing.userId);
}

export async function revokeRefreshToken(raw: string | undefined) {
  if (!raw) return;
  await RefreshToken.deleteOne({ tokenHash: hashToken(raw) });
}

export async function revokeAllUserRefreshTokens(userId: string) {
  await RefreshToken.deleteMany({ userId });
}
