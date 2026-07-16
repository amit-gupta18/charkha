import cookieParser from "cookie-parser";
import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "./middleware/auth";
import authRoutes from "./routes/auth";
import settingsRoutes from "./routes/settings";
import expenseRoutes from "./routes/expenses";
import incomeRoutes from "./routes/income";
import parseRoutes from "./routes/parse";
import dashboardRoutes from "./routes/dashboard";
import knowledgeRoutes from "./routes/knowledge";
import flatmateRoutes from "./routes/flatmates";
import splitRoutes from "./routes/splits";
import lendingRoutes from "./routes/lending";
import savingsRoutes from "./routes/savings";
import coinRoutes from "./routes/coins";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;

    res.status(dbConnected ? 200 : 503).json({
      ok: dbConnected,
      database: dbConnected ? "connected" : "disconnected",
    });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/settings", requireAuth, settingsRoutes);

  app.use("/api/expenses", requireAuth, expenseRoutes);
  app.use("/api/income", requireAuth, incomeRoutes);
  app.use("/api/parse", requireAuth, parseRoutes);
  app.use("/api/dashboard", requireAuth, dashboardRoutes);
  app.use("/api/knowledge", requireAuth, knowledgeRoutes);
  app.use("/api/coins", requireAuth, coinRoutes);
  app.use("/api/flatmates", requireAuth, flatmateRoutes);
  app.use("/api/splits", requireAuth, splitRoutes);
  app.use("/api/lending", requireAuth, lendingRoutes);
  app.use("/api/savings", requireAuth, savingsRoutes);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ message: "Something went wrong." });
  });

  return app;
}
