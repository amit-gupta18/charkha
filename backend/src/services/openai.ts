import OpenAI from "openai";
import { env } from "../config/env";
import { CATEGORIES, PAYMENT_MODES, INCOME_SOURCES } from "../utils/categories";

export interface ParsedExpense {
  description: string;
  amount: number;
  payment_mode: string;
  category: string;
  notes: string | null;
  date: string | null;
}

export interface ParsedSplitExpense extends ParsedExpense {
  flatmate_names: string[];
}

export interface ParsedIncome {
  amount: number;
  source: string;
  notes: string | null;
  date: string | null;
}

export interface ParsedLending {
  person_name: string;
  amount: number;
  reason: string | null;
  date: string | null;
}

export interface ParsedSplitClear {
  flatmate_name: string;
  amount: number;
  reason: string | null;
  date: string | null;
}

export type ParsedIntent =
  | { intent: "expense"; data: ParsedExpense }
  | { intent: "split_expense"; data: ParsedSplitExpense }
  | { intent: "income"; data: ParsedIncome }
  | { intent: "lending"; data: ParsedLending }
  | { intent: "split_clear"; data: ParsedSplitClear };

function getSystemPrompt() {
  const today = new Date().toISOString().split("T")[0];
  return `You are an intelligent parser for a personal finance tracker. Given a transcript, classify into exactly one intent: expense, split_expense, income, lending, or split_clear.

If it is a regular expense (no split), return:
{
  "intent": "expense",
  "data": {
    "description": (string),
    "amount": (number) INR,
    "payment_mode": (string) one of ${JSON.stringify(PAYMENT_MODES)},
    "category": (string) one of ${JSON.stringify(CATEGORIES)},
    "notes": (string or null),
    "date": (string or null) YYYY-MM-DD (Today is ${today})
  }
}

If the user mentions splitting with flatmates (keywords: "split with", "split among", "split between"), return:
{
  "intent": "split_expense",
  "data": {
    "description": (string),
    "amount": (number) total paid in INR,
    "payment_mode": (string) one of ${JSON.stringify(PAYMENT_MODES)},
    "category": (string) one of ${JSON.stringify(CATEGORIES)},
    "notes": (string or null),
    "date": (string or null) YYYY-MM-DD,
    "flatmate_names": (string[]) names of flatmates to split with, e.g. ["Rahul", "Rohan"]
  }
}

If it is income, return:
{
  "intent": "income",
  "data": {
    "amount": (number),
    "source": (string) one of ${JSON.stringify(INCOME_SOURCES)},
    "notes": (string or null),
    "date": (string or null) YYYY-MM-DD
  }
}

If the user lent money to someone (keywords: "lent", "loaned", "gave loan"), return:
{
  "intent": "lending",
  "data": {
    "person_name": (string),
    "amount": (number),
    "reason": (string or null) purpose e.g. "dinner",
    "date": (string or null) YYYY-MM-DD
  }
}

If a flatmate paid back toward splits (keywords: "cleared", "split clear", "paid back", "received from"), return:
{
  "intent": "split_clear",
  "data": {
    "flatmate_name": (string),
    "amount": (number),
    "reason": (string or null),
    "date": (string or null) YYYY-MM-DD
  }
}

Examples:
- "Wifi 430 split with Rahul Rohan Priya UPI" → split_expense
- "Lent Rahul 500 for dinner" → lending
- "Rahul cleared 300 for grocery" → split_clear
- "Swiggy 249 UPI" → expense

Respond ONLY with a single JSON object. No markdown.`;
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonCandidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  const firstBrace = jsonCandidate.indexOf("{");
  const lastBrace = jsonCandidate.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(jsonCandidate.slice(firstBrace, lastBrace + 1));
  }
  return JSON.parse(jsonCandidate);
}

function num(v: unknown): number {
  return typeof v === "number" ? v : Number(v) || 0;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export async function parseFinancialText(text: string): Promise<ParsedIntent> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: getSystemPrompt() },
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

  const result = parsed as Record<string, any>;
  const data = result.data || {};
  const intent = result.intent;

  if (intent === "income") {
    return {
      intent: "income",
      data: {
        amount: num(data.amount),
        source: str(data.source, INCOME_SOURCES[0]),
        notes: strOrNull(data.notes),
        date: strOrNull(data.date),
      },
    };
  }

  if (intent === "lending") {
    return {
      intent: "lending",
      data: {
        person_name: str(data.person_name),
        amount: num(data.amount),
        reason: strOrNull(data.reason),
        date: strOrNull(data.date),
      },
    };
  }

  if (intent === "split_clear") {
    return {
      intent: "split_clear",
      data: {
        flatmate_name: str(data.flatmate_name),
        amount: num(data.amount),
        reason: strOrNull(data.reason),
        date: strOrNull(data.date),
      },
    };
  }

  if (intent === "split_expense") {
    const names = Array.isArray(data.flatmate_names)
      ? data.flatmate_names.filter((n: unknown) => typeof n === "string")
      : [];
    return {
      intent: "split_expense",
      data: {
        description: str(data.description),
        amount: num(data.amount),
        payment_mode: str(data.payment_mode, PAYMENT_MODES[0]),
        category: str(data.category, CATEGORIES[0]),
        notes: strOrNull(data.notes),
        date: strOrNull(data.date),
        flatmate_names: names,
      },
    };
  }

  return {
    intent: "expense",
    data: {
      description: str(data.description),
      amount: num(data.amount),
      payment_mode: str(data.payment_mode, PAYMENT_MODES[0]),
      category: str(data.category, CATEGORIES[0]),
      notes: strOrNull(data.notes),
      date: strOrNull(data.date),
    },
  };
}
