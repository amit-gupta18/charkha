import { Router } from "express";
import { Types } from "mongoose";
import { Lending, serializeLending } from "../models/Lending";
import { isNonEmptyString, isNumber, parseLocalDate } from "../utils/validators";

const router = Router();

router.get("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { status } = request.query;

    const filter: Record<string, unknown> = { userId };
    if (status === "pending" || status === "settled") {
      filter.status = status;
    }

    const lendings = await Lending.find(filter).sort({ date: -1 }).lean();
    response.json({ lendings: lendings.map((l) => serializeLending(l as any)) });
  } catch (error) {
    next(error);
  }
});

router.get("/summary", async (request, response, next) => {
  try {
    const userId = new Types.ObjectId(request.user!.userId);
    const agg = await Lending.aggregate([
      { $match: { userId, status: "pending" } },
      { $group: { _id: null, totalPending: { $sum: "$amount" } } },
    ]);
    response.json({ totalPending: agg[0]?.totalPending ?? 0 });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const userId = request.user!.userId;
    const { personName, amount, reason, date, status } = request.body ?? {};

    if (!isNonEmptyString(personName)) {
      response.status(400).json({ message: "personName is required." });
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

    const lending = await Lending.create({
      userId,
      personName: personName.trim(),
      amount,
      reason: typeof reason === "string" ? reason : "",
      date: utcDate,
      status: status === "settled" ? "settled" : "pending",
    });

    response.status(201).json({ lending: serializeLending(lending) });
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

    const lending = await Lending.findOne({ _id: id, userId });
    if (!lending) {
      response.status(404).json({ message: "Lending entry not found." });
      return;
    }

    const { personName, amount, reason, date, status } = request.body ?? {};

    if (personName !== undefined) {
      if (!isNonEmptyString(personName)) {
        response.status(400).json({ message: "personName must be a string." });
        return;
      }
      lending.personName = personName.trim();
    }
    if (amount !== undefined) {
      if (!isNumber(amount) || amount <= 0) {
        response.status(400).json({ message: "amount must be a positive number." });
        return;
      }
      lending.amount = amount;
    }
    if (reason !== undefined) {
      lending.reason = typeof reason === "string" ? reason : "";
    }
    if (date !== undefined) {
      if (typeof date !== "string" || !date) {
        response.status(400).json({ message: "Invalid date." });
        return;
      }
      const parsedDate = parseLocalDate(date);
      if (!parsedDate) {
        response.status(400).json({ message: "Invalid date format." });
        return;
      }
      lending.date = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));
    }
    if (status === "pending" || status === "settled") {
      lending.status = status;
    }

    await lending.save();
    response.json({ lending: serializeLending(lending) });
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

    const lending = await Lending.findOneAndDelete({ _id: id, userId });
    if (!lending) {
      response.status(404).json({ message: "Lending entry not found." });
      return;
    }

    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
