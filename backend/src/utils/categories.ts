export const CATEGORIES = [
  "Life Infrastructure",
  "Performance & Growth",
  "Future Me",
  "Relationships & Generosity",
  "Lifestyle Enjoyment",
] as const;

export const PAYMENT_MODES = [
  "UPI",
  "Cash",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
] as const;

export const INCOME_SOURCES = ["Allowance", "Freelance", "Internship"] as const;

export const KNOWLEDGE_SOURCE_TYPES = [
  "Video",
  "Article",
  "Podcast",
  "Own Thought",
] as const;

export const KNOWLEDGE_TOPICS = [
  "Budgeting",
  "SIP",
  "Investing",
  "Insurance",
  "Taxes",
  "Debt",
  "Income",
  "General",
] as const;

export const EXPENSE_TYPES = ["Need", "Want", "Saving"] as const;

export type ExpenseType = "Need" | "Want" | "Saving";

export const CATEGORY_TYPE_MAP: Record<string, ExpenseType> = {
  "Life Infrastructure": "Need",
  "Performance & Growth": "Need",
  "Future Me": "Saving",
  "Relationships & Generosity": "Want",
  "Lifestyle Enjoyment": "Want",
};

export function categoryToType(category: string): ExpenseType {
  return CATEGORY_TYPE_MAP[category] ?? "Want";
}

export function oneOf<T extends string>(value: unknown, list: readonly T[]): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}
