import { Router } from "express";
import { Flatmate, serializeFlatmate } from "../models/Flatmate";
import { parseFinancialText } from "../services/openai";
import { matchFlatmateNames } from "../services/splits";
import { isNonEmptyString } from "../utils/validators";

const router = Router();

router.post("/", async (request, response, next) => {
  try {
    const { text } = request.body ?? {};
    const userId = request.user!.userId;

    if (!isNonEmptyString(text)) {
      response.status(400).json({ message: "text is required." });
      return;
    }

    const parsed = await parseFinancialText(text);

    if (parsed.intent === "expense" || parsed.intent === "split_expense") {
      const base = {
        description: parsed.data.description,
        amount: parsed.data.amount,
        paymentMode: parsed.data.payment_mode,
        category: parsed.data.category,
        notes: parsed.data.notes,
        date: parsed.data.date,
      };

      if (parsed.intent === "split_expense") {
        const flatmates = await Flatmate.find({ userId }).lean();
        const list = flatmates.map((f) => ({ id: String(f._id), name: f.name }));
        const { matched, unmatched } = matchFlatmateNames(parsed.data.flatmate_names, list);

        response.json({
          intent: "split_expense",
          data: {
            ...base,
            flatmateNames: parsed.data.flatmate_names,
            matchedFlatmates: matched.map((m) => {
              const full = flatmates.find((f) => String(f._id) === m.id);
              return full ? serializeFlatmate(full as any) : { id: m.id, name: m.name, phone: "" };
            }),
            unmatchedFlatmates: unmatched,
          },
        });
        return;
      }

      response.json({ intent: "expense", data: base });
      return;
    }

    if (parsed.intent === "income") {
      response.json({
        intent: "income",
        data: {
          amount: parsed.data.amount,
          source: parsed.data.source,
          notes: parsed.data.notes,
          date: parsed.data.date,
        },
      });
      return;
    }

    if (parsed.intent === "lending") {
      response.json({
        intent: "lending",
        data: {
          personName: parsed.data.person_name,
          amount: parsed.data.amount,
          reason: parsed.data.reason ?? "",
          date: parsed.data.date,
        },
      });
      return;
    }

    if (parsed.intent === "split_clear") {
      const flatmates = await Flatmate.find({ userId }).lean();
      const list = flatmates.map((f) => ({ id: String(f._id), name: f.name }));
      const { matched, unmatched } = matchFlatmateNames([parsed.data.flatmate_name], list);
      const hit = matched[0] ?? null;

      response.json({
        intent: "split_clear",
        data: {
          flatmateName: parsed.data.flatmate_name,
          flatmateId: hit?.id ?? null,
          unmatched: unmatched.length > 0,
          amount: parsed.data.amount,
          reason: parsed.data.reason ?? "",
          date: parsed.data.date,
        },
      });
      return;
    }

    response.status(502).json({ message: "Unknown intent from parser." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse expense.";
    response.status(502).json({ message });
  }
});

export default router;
