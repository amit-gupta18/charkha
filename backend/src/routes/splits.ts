import { Router } from "express";
import { Types } from "mongoose";
import { Expense, serializeExpense } from "../models/Expense";
import { Flatmate, serializeFlatmate } from "../models/Flatmate";
import { SplitMember, serializeSplitMember } from "../models/SplitMember";
import { SplitSettlement, serializeSplitSettlement } from "../models/SplitSettlement";
import {
  applySettlement,
  getFlatmatePendingTotal,
  reverseSettlement,
  settleMemberRemaining,
} from "../services/splits";
import { isNonEmptyString, isNumber, parseLocalDate } from "../utils/validators";

const router = Router();

router.get("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const splitExpenses = await Expense.find({ userId, isSplit: true }).sort({ date: -1 }).lean();
    const expenseIds = splitExpenses.map((e) => e._id);

    const [members, flatmates] = await Promise.all([
      SplitMember.find({ userId, expenseId: { $in: expenseIds } }).lean(),
      Flatmate.find({ userId }).lean(),
    ]);

    const flatmateMap = new Map(flatmates.map((f) => [String(f._id), serializeFlatmate(f as any)]));

    const splits = splitExpenses.map((exp) => {
      const expMembers = members
        .filter((m) => String(m.expenseId) === String(exp._id))
        .map((m) => ({
          ...serializeSplitMember(m as any),
          flatmate: flatmateMap.get(String(m.flatmateId)) ?? null,
        }));
      return {
        expense: serializeExpense(exp as any),
        members: expMembers,
      };
    });

    response.json({ splits });
  } catch (error) {
    next(error);
  }
});

router.get("/summary", async (request, response, next) => {
  try {
    const userId = new Types.ObjectId(request.user!.userId);

    const agg = await SplitMember.aggregate([
      { $match: { userId, status: "pending" } },
      {
        $project: {
          flatmateId: 1,
          pending: { $subtract: ["$amountOwed", "$amountSettled"] },
        },
      },
      { $group: { _id: "$flatmateId", pendingTotal: { $sum: "$pending" } } },
    ]);

    const flatmates = await Flatmate.find({ userId }).lean();
    const nameMap = new Map(flatmates.map((f) => [String(f._id), f.name]));

    response.json({
      summary: agg.map((row) => ({
        flatmateId: String(row._id),
        name: nameMap.get(String(row._id)) ?? "Unknown",
        pendingTotal: Math.round(row.pendingTotal * 100) / 100,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/members/:id/settle", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { id } = request.params;

    if (!Types.ObjectId.isValid(id)) {
      response.status(400).json({ message: "Invalid id." });
      return;
    }

    const result = await settleMemberRemaining(userId, id);
    response.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to settle.";
    response.status(400).json({ message });
  }
});

router.get("/settlements", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { flatmateId } = request.query;

    const filter: Record<string, unknown> = { userId };
    if (typeof flatmateId === "string" && flatmateId) {
      filter.flatmateId = flatmateId;
    }

    const settlements = await SplitSettlement.find(filter).sort({ date: -1 }).lean();
    const flatmates = await Flatmate.find({ userId }).lean();
    const nameMap = new Map(flatmates.map((f) => [String(f._id), f.name]));

    response.json({
      settlements: settlements.map((s) => ({
        ...serializeSplitSettlement(s as any),
        flatmateName: nameMap.get(String(s.flatmateId)) ?? "Unknown",
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/settlements", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { flatmateId, amount, reason, date } = request.body ?? {};

    if (!isNonEmptyString(flatmateId) || !Types.ObjectId.isValid(flatmateId)) {
      response.status(400).json({ message: "Valid flatmateId is required." });
      return;
    }

    if (!isNumber(amount) || amount <= 0) {
      response.status(400).json({ message: "amount must be a positive number." });
      return;
    }

    const dateStr = typeof date === "string" && date ? date : new Date().toISOString().slice(0, 10);
    const parsedDate = parseLocalDate(dateStr);
    if (!parsedDate) {
      response.status(400).json({ message: "Invalid date." });
      return;
    }

    const utcDate = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));

    const pendingBefore = await getFlatmatePendingTotal(userId, flatmateId);
    const settlement = await applySettlement(
      userId,
      flatmateId,
      amount,
      typeof reason === "string" ? reason : "",
      utcDate,
    );
    const pendingAfter = await getFlatmatePendingTotal(userId, flatmateId);

    response.status(201).json({ settlement, pendingBefore, pendingAfter });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record settlement.";
    response.status(400).json({ message });
  }
});

router.delete("/settlements/:id", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { id } = request.params;

    if (!Types.ObjectId.isValid(id)) {
      response.status(400).json({ message: "Invalid id." });
      return;
    }

    await reverseSettlement(userId, id);
    response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reverse settlement.";
    response.status(400).json({ message });
  }
});

export default router;
