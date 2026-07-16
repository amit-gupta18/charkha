import { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "../utils/jwt";

function readBearerToken(request: Request) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const token = readBearerToken(request);
    if (!token) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }

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
