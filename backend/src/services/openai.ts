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

export interface ParsedIncome {
  amount: number;
  source: string;
  notes: string | null;
  date: string | null;
}

export type ParsedIntent = 
  | { intent: "expense"; data: ParsedExpense }
  | { intent: "income"; data: ParsedIncome };

function getSystemPrompt() {
  const today = new Date().toISOString().split("T")[0];
  return `You are an intelligent parser for a personal finance tracker. Given a transcript of a spoken or typed financial log, determine if it is an "expense" or an "income".

If it is an expense, return a JSON object with this exact structure:
{
  "intent": "expense",
  "data": {
    "description": (string) short description of what was purchased,
    "amount": (number) the amount in INR,
    "payment_mode": (string) one of ${JSON.stringify(PAYMENT_MODES)},
    "category": (string) one of ${JSON.stringify(CATEGORIES)},
    "notes": (string or null) any extra context,
    "date": (string or null) ISO date string in YYYY-MM-DD format (Today is ${today})
  }
}

If it is an income, return a JSON object with this exact structure:
{
  "intent": "income",
  "data": {
    "amount": (number) the amount in INR,
    "source": (string) one of ${JSON.stringify(INCOME_SOURCES)},
    "notes": (string or null) any extra context,
    "date": (string or null) ISO date string in YYYY-MM-DD format (Today is ${today})
  }
}

Respond ONLY with a single JSON object matching one of the formats above. Do not include markdown formatting or code fences.`;
}

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

export async function parseFinancialText(text: string): Promise<ParsedIntent> {
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

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

  if (result.intent === "income") {
    return {
      intent: "income",
      data: {
        amount: typeof data.amount === "number" ? data.amount : Number(data.amount) || 0,
        source: typeof data.source === "string" ? data.source : INCOME_SOURCES[0],
        notes: typeof data.notes === "string" ? data.notes : null,
        date: typeof data.date === "string" ? data.date : null,
      }
    };
  }

  return {
    intent: "expense",
    data: {
      description: typeof data.description === "string" ? data.description : "",
      amount: typeof data.amount === "number" ? data.amount : Number(data.amount) || 0,
      payment_mode:
        typeof data.payment_mode === "string" ? data.payment_mode : PAYMENT_MODES[0],
      category:
        typeof data.category === "string" ? data.category : CATEGORIES[0],
      notes: typeof data.notes === "string" ? data.notes : null,
      date: typeof data.date === "string" ? data.date : null,
    }
  };
}
