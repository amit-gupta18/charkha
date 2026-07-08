import { Router } from "express";
import { Types } from "mongoose";
import { Income, serializeIncome } from "../models/Income";
import { INCOME_SOURCES, oneOf } from "../utils/categories";
import { isNonEmptyString, isNumber, parseLocalDate } from "../utils/validators";

const router = Router();

router.get("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { source, startDate, endDate } = request.query;

    const filter: Record<string, unknown> = { userId };

    if (typeof source === "string" && source) filter.source = source;

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

    const incomes = await Income.find(filter).sort({ date: -1 }).lean();
    response.json({ incomes: incomes.map((i) => serializeIncome(i as any)) });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { date, amount, source, notes } = request.body ?? {};

    if (!isNonEmptyString(source) || !oneOf(source, INCOME_SOURCES)) {
      response.status(400).json({ message: "Valid source is required." });
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

    const utcDate = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));

    const income = await Income.create({
      userId,
      date: utcDate,
      amount,
      source,
      notes: typeof notes === "string" ? notes : "",
    });

    response.status(201).json({ income: serializeIncome(income) });
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

    const income = await Income.findOne({ _id: id, userId }).lean();

    if (!income) {
      response.status(404).json({ message: "Income not found." });
      return;
    }

    response.json({ income: serializeIncome(income as any) });
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

    const income = await Income.findOne({ _id: id, userId });

    if (!income) {
      response.status(404).json({ message: "Income not found." });
      return;
    }

    const { date, amount, source, notes } = request.body ?? {};

    if (source !== undefined) {
      if (!isNonEmptyString(source) || !oneOf(source, INCOME_SOURCES)) {
        response.status(400).json({ message: "Invalid source." });
        return;
      }
      income.source = source;
    }
    if (amount !== undefined) {
      if (!isNumber(amount) || amount <= 0) {
        response.status(400).json({ message: "amount must be a positive number." });
        return;
      }
      income.amount = amount;
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
      income.date = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));
    }
    if (notes !== undefined) {
      income.notes = typeof notes === "string" ? notes : "";
    }

    await income.save();

    response.json({ income: serializeIncome(income) });
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

    const income = await Income.findOneAndDelete({ _id: id, userId });

    if (!income) {
      response.status(404).json({ message: "Income not found." });
      return;
    }

    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
