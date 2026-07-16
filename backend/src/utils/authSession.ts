import { signAuthToken } from "./jwt";
import { createRefreshToken } from "./refreshToken";

export async function issueAuthTokens(userId: string, email: string) {
  const accessToken = signAuthToken({ userId, email });
  const refreshToken = await createRefreshToken(userId);
  return { accessToken, refreshToken };
}
