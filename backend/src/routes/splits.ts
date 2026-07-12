import { Router } from "express";
import { Types } from "mongoose";
import { Expense, serializeExpense } from "../models/Expense";
import { Flatmate, serializeFlatmate } from "../models/Flatmate";
import { SplitBill, serializeSplitBill } from "../models/SplitBill";
import { SplitMember, serializeSplitMember } from "../models/SplitMember";
import { SplitSettlement, serializeSplitSettlement } from "../models/SplitSettlement";
import {
  applySettlement,
  createSplitBillTheyPaid,
  createSplitMembers,
  getFlatmatePendingTotal,
  getPlateBalances,
  reverseSettlement,
  settleMemberRemaining,
} from "../services/splits";
import { applyCoinRulesForExpense } from "../services/coins";
import { CATEGORIES, PAYMENT_MODES, categoryToType } from "../utils/categories";
import { isNonEmptyString, isNumber, parseLocalDate } from "../utils/validators";

const router = Router();

router.get("/plate", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const plate = await getPlateBalances(userId);
    response.json(plate);
  } catch (error) {
    next(error);
  }
});

router.get("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;

    const [bills, members, flatmates] = await Promise.all([
      SplitBill.find({ userId }).sort({ date: -1 }).lean(),
      SplitMember.find({ userId }).lean(),
      Flatmate.find({ userId }).lean(),
    ]);

    const flatmateMap = new Map(flatmates.map((f) => [String(f._id), serializeFlatmate(f as any)]));

    const splits = bills.map((bill) => {
      const billMembers = members
        .filter((m) => m.splitBillId && String(m.splitBillId) === String(bill._id))
        .map((m) => ({
          ...serializeSplitMember(m as any),
          flatmate: flatmateMap.get(String(m.flatmateId)) ?? null,
        }));

      return {
        bill: serializeSplitBill(bill as any),
        members: billMembers,
        expense: null as ReturnType<typeof serializeExpense> | null,
      };
    });

    const expenseIds = bills.filter((b) => b.expenseId).map((b) => b.expenseId);
    const expenses = await Expense.find({ _id: { $in: expenseIds } }).lean();
    const expenseMap = new Map(expenses.map((e) => [String(e._id), serializeExpense(e as any)]));

    const splitsWithExpense = splits.map((s) => ({
      ...s,
      expense: s.bill.expenseId ? expenseMap.get(s.bill.expenseId) ?? null : null,
    }));

    response.json({ splits: splitsWithExpense });
  } catch (error) {
    next(error);
  }
});

router.post("/bills", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const {
      paidBy,
      description,
      totalAmount,
      date,
      flatmateIds,
      shares,
      category,
      paymentMode,
    } = request.body ?? {};

    if (!isNonEmptyString(description)) {
      response.status(400).json({ message: "description is required." });
      return;
    }
    if (!isNumber(totalAmount) || totalAmount <= 0) {
      response.status(400).json({ message: "totalAmount must be positive." });
      return;
    }
    if (!Array.isArray(flatmateIds) || flatmateIds.length === 0) {
      response.status(400).json({ message: "Select at least one flatmate." });
      return;
    }

    const dateStr = typeof date === "string" && date ? date : new Date().toISOString().slice(0, 10);
    const parsedDate = parseLocalDate(dateStr);
    if (!parsedDate) {
      response.status(400).json({ message: "Invalid date." });
      return;
    }
    const utcDate = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));

    const shareList = Array.isArray(shares) ? shares : undefined;

    if (paidBy === "user" || paidBy === "me") {
      const cat = typeof category === "string" && CATEGORIES.includes(category as typeof CATEGORIES[number])
        ? category
        : CATEGORIES[0];
      const pm = typeof paymentMode === "string" && PAYMENT_MODES.includes(paymentMode as typeof PAYMENT_MODES[number])
        ? paymentMode
        : PAYMENT_MODES[0];

      const expense = await Expense.create({
        userId,
        date: utcDate,
        description: description.trim(),
        category: cat,
        amount: totalAmount,
        paymentMode: pm,
        type: categoryToType(cat),
        notes: "",
      });

      try {
        const result = await createSplitMembers(userId, expense, flatmateIds, shareList);
        await applyCoinRulesForExpense(userId, expense);
        response.status(201).json({
          bill: result.bill,
          expense: serializeExpense(expense),
          members: result.members,
        });
      } catch (err) {
        await Expense.findByIdAndDelete(expense._id);
        throw err;
      }
      return;
    }

    if (!isNonEmptyString(paidBy) || !Types.ObjectId.isValid(paidBy)) {
      response.status(400).json({ message: "paidBy must be 'user' or a flatmate id." });
      return;
    }

    const result = await createSplitBillTheyPaid(userId, {
      date: utcDate,
      description: description.trim(),
      totalAmount,
      paidByFlatmateId: paidBy,
      flatmateIds,
      shares: shareList,
    });

    response.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create split.";
    response.status(400).json({ message });
  }
});

router.get("/summary", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const plate = await getPlateBalances(userId);
    response.json({
      summary: plate.perFlatmate.map((p) => ({
        flatmateId: p.flatmateId,
        name: p.name,
        pendingTotal: p.netBalance,
        theyOweYou: p.theyOweYou,
        youOweThem: p.youOweThem,
        netBalance: p.netBalance,
      })),
      netTotal: plate.netTotal,
      totalReceivable: plate.totalReceivable,
      totalPayable: plate.totalPayable,
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
    const { flatmateId, amount, reason, date, direction } = request.body ?? {};

    if (!isNonEmptyString(flatmateId) || !Types.ObjectId.isValid(flatmateId)) {
      response.status(400).json({ message: "Valid flatmateId is required." });
      return;
    }

    if (!isNumber(amount) || amount <= 0) {
      response.status(400).json({ message: "amount must be a positive number." });
      return;
    }

    const dir = direction === "paid" ? "paid" : "received";

    const dateStr = typeof date === "string" && date ? date : new Date().toISOString().slice(0, 10);
    const parsedDate = parseLocalDate(dateStr);
    if (!parsedDate) {
      response.status(400).json({ message: "Invalid date." });
      return;
    }

    const utcDate = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));

    const entryType = dir === "received" ? "receivable" : "payable";
    const pendingBefore = await getFlatmatePendingTotal(userId, flatmateId, entryType);
    const settlement = await applySettlement(
      userId,
      flatmateId,
      amount,
      typeof reason === "string" ? reason : "",
      utcDate,
      dir,
    );
    const pendingAfter = await getFlatmatePendingTotal(userId, flatmateId, entryType);

    response.status(201).json({ settlement, pendingBefore, pendingAfter, direction: dir });
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
