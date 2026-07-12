import { Router } from "express";
import { Types } from "mongoose";
import { Expense, serializeExpense } from "../models/Expense";
import { applyCoinRulesForExpense } from "../services/coins";
import { createSplitMembers, deleteSplitMembersForExpense } from "../services/splits";
import { CATEGORIES, PAYMENT_MODES, categoryToType, oneOf } from "../utils/categories";
import { isNonEmptyString, isNumber, parseLocalDate } from "../utils/validators";

const router = Router();

router.get("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { category, paymentMode, type, startDate, endDate, search } = request.query;

    const filter: Record<string, unknown> = { userId };

    if (typeof category === "string" && category) filter.category = category;
    if (typeof paymentMode === "string" && paymentMode) filter.paymentMode = paymentMode;
    if (typeof type === "string" && type) filter.type = type;

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (typeof startDate === "string") {
        const parsed = parseLocalDate(startDate);
        if (parsed) dateFilter.$gte = parsed;
      }
      if (typeof endDate === "string") {
        const parsed = parseLocalDate(endDate);
        if (parsed) dateFilter.$lte = parsed;
      }
      filter.date = dateFilter;
    }

    if (typeof search === "string" && search) {
      filter.description = { $regex: search, $options: "i" };
    }

    const expenses = await Expense.find(filter).sort({ date: -1 }).lean();
    response.json({ expenses: expenses.map((e) => serializeExpense(e as any)) });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { date, description, category, amount, paymentMode, notes, split } = request.body ?? {};

    if (!isNonEmptyString(description) || !isNonEmptyString(category) || !isNonEmptyString(paymentMode)) {
      response.status(400).json({ message: "description, category and paymentMode are required." });
      return;
    }

    if (!oneOf(category, CATEGORIES)) {
      response.status(400).json({ message: "Invalid category." });
      return;
    }

    if (!oneOf(paymentMode, PAYMENT_MODES)) {
      response.status(400).json({ message: "Invalid paymentMode." });
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

    const parsedDate = parseLocalDate(date);

    if (!parsedDate) {
      response.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
      return;
    }

    // Store as UTC midnight so UTC-based dashboard ranges match.
    const utcDate = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));

    const expense = await Expense.create({
      userId,
      date: utcDate,
      description,
      category,
      amount,
      paymentMode,
      type: categoryToType(category),
      notes: typeof notes === "string" ? notes : "",
    });

    let splitMembers;
    if (split && Array.isArray(split.flatmateIds) && split.flatmateIds.length > 0) {
      try {
        const result = await createSplitMembers(
          userId,
          expense,
          split.flatmateIds,
          Array.isArray(split.shares) ? split.shares : undefined,
        );
        splitMembers = result.members;
      } catch (err) {
        await Expense.findByIdAndDelete(expense._id);
        const message = err instanceof Error ? err.message : "Failed to create split.";
        response.status(400).json({ message });
        return;
      }
    }

    await applyCoinRulesForExpense(userId, expense);

    response.status(201).json({ expense: serializeExpense(expense), splitMembers });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { id } = request.params;

    if (!Types.ObjectId.isValid(id)) {
      response.status(400).json({ message: "Invalid id." });
      return;
    }

    const expense = await Expense.findOne({ _id: id, userId }).lean();

    if (!expense) {
      response.status(404).json({ message: "Expense not found." });
      return;
    }

    response.json({ expense: serializeExpense(expense as any) });
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

    const expense = await Expense.findOne({ _id: id, userId });

    if (!expense) {
      response.status(404).json({ message: "Expense not found." });
      return;
    }

    const { date, description, category, amount, paymentMode, notes } = request.body ?? {};

    if (description !== undefined) {
      if (!isNonEmptyString(description)) {
        response.status(400).json({ message: "description must be a string." });
        return;
      }
      expense.description = description;
    }
    if (category !== undefined) {
      if (!oneOf(category, CATEGORIES)) {
        response.status(400).json({ message: "Invalid category." });
        return;
      }
      expense.category = category;
    }
    if (amount !== undefined) {
    if (!isNumber(amount) || amount <= 0) {
        response.status(400).json({ message: "amount must be a positive number." });
        return;
      }
      if (expense.isSplit) {
        response.status(400).json({ message: "Cannot change amount on a split expense." });
        return;
      }
      expense.amount = amount;
      expense.userShare = amount;
    }
    if (paymentMode !== undefined) {
      if (!oneOf(paymentMode, PAYMENT_MODES)) {
        response.status(400).json({ message: "Invalid paymentMode." });
        return;
      }
      expense.paymentMode = paymentMode;
    }
    if (date !== undefined) {
      if (typeof date !== "string" || !date) {
        response.status(400).json({ message: "Invalid date." });
        return;
      }
      const parsedDate = parseLocalDate(date);
      if (!parsedDate) {
        response.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD." });
        return;
      }
      expense.date = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));
    }
    if (notes !== undefined) {
      expense.notes = typeof notes === "string" ? notes : "";
    }

    // type is recomputed from category via pre-validate hook.
    // Note: we do NOT retroactively fix coins for type changes.
    await expense.save();

    response.json({ expense: serializeExpense(expense) });
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

    const expense = await Expense.findOne({ _id: id, userId });

    if (!expense) {
      response.status(404).json({ message: "Expense not found." });
      return;
    }

    try {
      await deleteSplitMembersForExpense(userId, id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cannot delete split expense.";
      response.status(400).json({ message });
      return;
    }

    await Expense.findOneAndDelete({ _id: id, userId });

    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
