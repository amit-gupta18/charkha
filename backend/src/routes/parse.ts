import { Router } from "express";
import { parseFinancialText } from "../services/openai";
import { isNonEmptyString } from "../utils/validators";

const router = Router();

router.post("/", async (request, response, next) => {
  try {
    const { text } = request.body ?? {};

    if (!isNonEmptyString(text)) {
      response.status(400).json({ message: "text is required." });
      return;
    }

    const parsed = await parseFinancialText(text);

    if (parsed.intent === "expense") {
      response.json({
        intent: "expense",
        data: {
          description: parsed.data.description,
          amount: parsed.data.amount,
          paymentMode: parsed.data.payment_mode,
          category: parsed.data.category,
          notes: parsed.data.notes,
          date: parsed.data.date,
        },
      });
      return;
    }

    response.json({
      intent: "income",
      data: {
        amount: parsed.data.amount,
        source: parsed.data.source,
        notes: parsed.data.notes,
        date: parsed.data.date,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse expense.";
    response.status(502).json({ message });
  }
});

export default router;
