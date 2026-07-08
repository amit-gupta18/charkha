import mongoose from "mongoose";
import { env } from "./env";

export async function connectToDatabase() {
  await mongoose.connect(env.MONGO_URI);
}
