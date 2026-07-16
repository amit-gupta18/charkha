import { Router } from "express";
import { User } from "../models/User";
import { Settings } from "../models/Settings";
import { clearSession, establishSession, resolveSession } from "../utils/authSession";
import { comparePassword, hashPassword } from "../utils/passwords";

const router = Router();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function serializeUser(user: { _id: unknown; name: string; email: string; createdAt?: Date; updatedAt?: Date }) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

router.post("/register", async (request, response, next) => {
  try {
    const name = readString(request.body?.name).trim();
    const email = readString(request.body?.email) ? normalizeEmail(readString(request.body?.email)) : "";
    const password = readString(request.body?.password);

    if (!name || !email || !password) {
      response.status(400).json({ message: "Name, email, and password are required." });
      return;
    }

    if (password.length < 6) {
      response.status(400).json({ message: "Password must be at least 6 characters." });
      return;
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      response.status(409).json({ message: "An account with this email already exists." });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email, passwordHash });

    await Settings.create({ userId: user._id });

    await establishSession(response, String(user._id), user.email, request);
    response.status(201).json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (request, response, next) => {
  try {
    const email = readString(request.body?.email) ? normalizeEmail(readString(request.body?.email)) : "";
    const password = readString(request.body?.password);

    if (!email || !password) {
      response.status(400).json({ message: "Email and password are required." });
      return;
    }

    const user = await User.findOne({ email });

    if (!user) {
      response.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const isMatch = await comparePassword(password, user.passwordHash);

    if (!isMatch) {
      response.status(401).json({ message: "Invalid email or password." });
      return;
    }

    await establishSession(response, String(user._id), user.email, request);
    response.json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (request, response) => {
  await clearSession(request, response);
  response.json({ success: true });
});

router.post("/refresh", async (request, response) => {
  const session = await resolveSession(request, response);

  if (!session) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  const user = await User.findById(session.userId);

  if (!user) {
    await clearSession(request, response);
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  response.json({ user: serializeUser(user) });
});

router.get("/me", async (request, response) => {
  const session = await resolveSession(request, response);

  if (!session) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  const user = await User.findById(session.userId);

  if (!user) {
    await clearSession(request, response);
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  response.json({ user: serializeUser(user) });
});

export default router;
