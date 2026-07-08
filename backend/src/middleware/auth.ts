import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { verifyAuthToken } from "../utils/jwt";

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.cookies?.[env.COOKIE_NAME];

  if (!token) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const payload = verifyAuthToken(token);

    request.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch {
    response.status(401).json({ message: "Unauthorized" });
  }
}
