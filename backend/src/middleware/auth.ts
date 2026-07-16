import { NextFunction, Request, Response } from "express";
import { resolveSession } from "../utils/authSession";

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  try {
    const session = await resolveSession(request, response);

    if (!session) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }

    request.user = {
      userId: session.userId,
      email: session.email,
    };

    next();
  } catch {
    response.status(401).json({ message: "Unauthorized" });
  }
}
