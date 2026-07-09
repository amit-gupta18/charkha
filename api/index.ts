import { createApp } from "../backend/src/app";
import { connectToDatabase } from "../backend/src/config/db";

const app = createApp();
let dbReady: Promise<void> | null = null;

function ensureDatabase() {
  if (!dbReady) {
    dbReady = connectToDatabase().then(() => undefined);
  }
  return dbReady;
}

export default async function handler(req: unknown, res: unknown) {
  await ensureDatabase();
  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
