import mongoose from "mongoose";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __mongoosePromise: Promise<typeof mongoose> | undefined;
}

export async function connectToDatabase() {
  if (global.__mongoosePromise) {
    return global.__mongoosePromise;
  }

  global.__mongoosePromise = mongoose.connect(env.MONGO_URI);
  return global.__mongoosePromise;
}
