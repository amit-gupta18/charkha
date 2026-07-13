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

export const SAVINGS_KINDS = ["invested", "saved"] as const;

export const SAVINGS_DESTINATIONS = [
  "SIP",
  "Mutual Fund",
  "Stocks",
  "FD",
  "Bank Savings",
  "Emergency Fund",
  "Other",
] as const;

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

export type Category = (typeof CATEGORIES)[number];
export type PaymentMode = (typeof PAYMENT_MODES)[number];
export type IncomeSource = (typeof INCOME_SOURCES)[number];
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];
export type KnowledgeTopic = (typeof KNOWLEDGE_TOPICS)[number];
