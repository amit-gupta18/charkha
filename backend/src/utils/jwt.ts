import jwt from "jsonwebtoken";
import { env } from "../config/env";

type AuthTokenPayload = {
  userId: string;
  email: string;
};

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
