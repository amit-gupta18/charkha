export type User = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthResponse = {
  user: User;
};

export type Expense = {
  id: string;
  userId?: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMode: string;
  type: "Need" | "Want" | "Saving";
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Income = {
  id: string;
  userId?: string;
  date: string;
  amount: number;
  source: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Settings = {
  userId?: string;
  monthlyIncome: number;
  weeklyLimit: number;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
};

export type KnowledgeNote = {
  id: string;
  userId?: string;
  title: string;
  sourceUrl?: string;
  sourceType: string;
  topic: string;
  note: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CoinTransaction = {
  id: string;
  userId?: string;
  date: string;
  amount: number;
  reason: string;
  referenceId?: string;
  referenceType?: string;
  createdAt?: string;
};

export type DashboardData = {
  monthlyIncome: number;
  weeklySpend: number;
  weeklyLimit: number;
  weeklyRatio: number;
  monthlySpend: number;
  todaySpend: number;
  typeSplit: { Need: number; Want: number; Saving: number };
  recentExpenses: Expense[];
  coinBalance: number;
};
