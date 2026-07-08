import OpenAI from "openai";
import { env } from "../config/env";
import { CATEGORIES, PAYMENT_MODES } from "../utils/categories";

export interface ParsedExpense {
  description: string;
  amount: number;
  payment_mode: string;
  category: string;
  notes: string | null;
  date: string | null;
}

const SYSTEM_PROMPT = `You are a parser for a personal expense tracker. Given a transcript of a spoken or typed expense, return ONLY a JSON object with these fields:
- description (string): short description of what was purchased
- amount (number): the amount in INR
- payment_mode (string): one of ${JSON.stringify(PAYMENT_MODES)}
- category (string): one of ${JSON.stringify(CATEGORIES)}
- notes (string or null): any extra context
- date (string or null): ISO date string in YYYY-MM-DD format. Resolve relative dates like "yesterday" or "last Friday" to the actual date. If no date is mentioned, use null.

Respond with a single JSON object and no other text. Do not include code fences.`;

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonCandidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const firstBrace = jsonCandidate.indexOf("{");
  const lastBrace = jsonCandidate.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const inner = jsonCandidate.slice(firstBrace, lastBrace + 1);
    return JSON.parse(inner);
  }

  return JSON.parse(jsonCandidate);
}

export async function parseExpenseText(text: string): Promise<ParsedExpense> {
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    temperature: 0,
  });

  const raw = completion.choices[0]?.message?.content ?? "";

  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch {
    throw new Error("Failed to parse response from OpenAI");
  }

  const data = parsed as Record<string, unknown>;

  return {
    description: typeof data.description === "string" ? data.description : "",
    amount: typeof data.amount === "number" ? data.amount : Number(data.amount) || 0,
    payment_mode:
      typeof data.payment_mode === "string" ? data.payment_mode : PAYMENT_MODES[0],
    category:
      typeof data.category === "string" ? data.category : CATEGORIES[0],
    notes: typeof data.notes === "string" ? data.notes : null,
    date: typeof data.date === "string" ? data.date : null,
  };
}
