import { Router } from "express";
import { Settings } from "../models/Settings";

const router = Router();

router.get("/", async (request, response, next) => {
  try {
    const userId = request.user?.userId;
    let settings = await Settings.findOne({ userId }).lean();

    if (!settings) {
      const created = await Settings.create({ userId });
      settings = created.toObject();
    }

    response.json({ settings });
  } catch (error) {
    next(error);
  }
});

router.put("/", async (request, response, next) => {
  try {
    const userId = request.user?.userId;

    if (!userId) {
      response.status(401).json({ message: "Unauthorized." });
      return;
    }

    const { monthlyIncome, weeklyLimit, needsPct, wantsPct, savingsPct, startingBalance } = request.body ?? {};

    const update: Record<string, number> = {};

    if (typeof monthlyIncome === "number") update.monthlyIncome = monthlyIncome;
    if (typeof weeklyLimit === "number") update.weeklyLimit = weeklyLimit;
    if (typeof needsPct === "number") update.needsPct = needsPct;
    if (typeof wantsPct === "number") update.wantsPct = wantsPct;
    if (typeof savingsPct === "number") update.savingsPct = savingsPct;
    if (typeof startingBalance === "number") update.startingBalance = startingBalance;

    if (Object.keys(update).length === 0) {
      response.status(400).json({ message: "No valid settings fields provided." });
      return;
    }

    const settings = await Settings.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true, upsert: true },
    ).lean();

    response.json({ settings });
  } catch (error) {
    next(error);
  }
});

export default router;
