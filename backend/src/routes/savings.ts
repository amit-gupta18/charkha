import { Router } from "express";
import { Types } from "mongoose";
import { SAVINGS_KINDS, Saving, serializeSaving } from "../models/Saving";
import { isNonEmptyString, isNumber, parseLocalDate } from "../utils/validators";

const router = Router();

function parseUtcDate(date: string) {
  const parsed = parseLocalDate(date);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

router.get("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { status, kind } = request.query;

    const filter: Record<string, unknown> = { userId };
    if (status === "active" || status === "withdrawn") filter.status = status;
    if (kind === "invested" || kind === "saved") filter.kind = kind;

    const savings = await Saving.find(filter).sort({ date: -1 }).lean();
    response.json({ savings: savings.map((s) => serializeSaving(s as any)) });
  } catch (error) {
    next(error);
  }
});

router.get("/summary", async (request, response, next) => {
  try {
    const userId = new Types.ObjectId(request.user!.userId);
    const [activeAgg, investedAgg, savedAgg] = await Promise.all([
      Saving.aggregate([
        { $match: { userId, status: "active" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Saving.aggregate([
        { $match: { userId, status: "active", kind: "invested" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Saving.aggregate([
        { $match: { userId, status: "active", kind: "saved" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    response.json({
      totalActive: activeAgg[0]?.total ?? 0,
      totalInvested: investedAgg[0]?.total ?? 0,
      totalSaved: savedAgg[0]?.total ?? 0,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { kind, amount, destination, reason, date } = request.body ?? {};

    if (kind !== "invested" && kind !== "saved") {
      response.status(400).json({ message: "kind must be 'invested' or 'saved'." });
      return;
    }

    if (!isNumber(amount) || amount <= 0) {
      response.status(400).json({ message: "amount must be a positive number." });
      return;
    }

    if (typeof date !== "string" || !date) {
      response.status(400).json({ message: "date is required." });
      return;
    }

    const utcDate = parseUtcDate(date);
    if (!utcDate) {
      response.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
      return;
    }

    const saving = await Saving.create({
      userId,
      kind,
      amount,
      destination: typeof destination === "string" ? destination.trim() : "",
      reason: typeof reason === "string" ? reason : "",
      date: utcDate,
      status: "active",
    });

    response.status(201).json({ saving: serializeSaving(saving) });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { id } = request.params;

    if (!Types.ObjectId.isValid(id)) {
      response.status(400).json({ message: "Invalid id." });
      return;
    }

    const saving = await Saving.findOne({ _id: id, userId });
    if (!saving) {
      response.status(404).json({ message: "Saving entry not found." });
      return;
    }

    const { kind, amount, destination, reason, date, status } = request.body ?? {};

    if (kind !== undefined) {
      if (!SAVINGS_KINDS.includes(kind)) {
        response.status(400).json({ message: "Invalid kind." });
        return;
      }
      saving.kind = kind;
    }
    if (amount !== undefined) {
      if (!isNumber(amount) || amount <= 0) {
        response.status(400).json({ message: "amount must be a positive number." });
        return;
      }
      saving.amount = amount;
    }
    if (destination !== undefined) {
      saving.destination = typeof destination === "string" ? destination.trim() : "";
    }
    if (reason !== undefined) {
      saving.reason = typeof reason === "string" ? reason : "";
    }
    if (date !== undefined) {
      if (typeof date !== "string" || !date) {
        response.status(400).json({ message: "Invalid date." });
        return;
      }
      const utcDate = parseUtcDate(date);
      if (!utcDate) {
        response.status(400).json({ message: "Invalid date format." });
        return;
      }
      saving.date = utcDate;
    }
    if (status === "active" || status === "withdrawn") {
      saving.status = status;
      if (status === "withdrawn" && !saving.withdrawnAt) {
        saving.withdrawnAt = new Date();
      }
      if (status === "active") {
        saving.withdrawnAt = null;
      }
    }

    await saving.save();
    response.json({ saving: serializeSaving(saving) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { id } = request.params;

    if (!Types.ObjectId.isValid(id)) {
      response.status(400).json({ message: "Invalid id." });
      return;
    }

    const saving = await Saving.findOneAndDelete({ _id: id, userId });
    if (!saving) {
      response.status(404).json({ message: "Saving entry not found." });
      return;
    }

    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
