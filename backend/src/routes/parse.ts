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

    response.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse expense.";
    response.status(502).json({ message });
  }
});

export default router;
