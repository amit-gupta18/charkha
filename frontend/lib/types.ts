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
  userShare: number;
  isSplit: boolean;
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
  startingBalance: number;
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

export type Flatmate = {
  id: string;
  name: string;
  phone?: string;
};

export type SplitMember = {
  id: string;
  expenseId: string;
  flatmateId: string;
  amountOwed: number;
  amountSettled: number;
  amountPending: number;
  status: "pending" | "settled";
  flatmate?: Flatmate | null;
};

export type SplitExpense = {
  expense: Expense;
  members: SplitMember[];
};

export type SplitSettlement = {
  id: string;
  flatmateId: string;
  flatmateName?: string;
  amount: number;
  reason: string;
  date: string;
};

export type Lending = {
  id: string;
  personName: string;
  amount: number;
  reason: string;
  date: string;
  status: "pending" | "settled";
};

export type SplitsSummaryItem = {
  flatmateId: string;
  name: string;
  pendingTotal: number;
};

export type DashboardData = {
  monthlyIncome: number;
  weeklyIncome: number;
  incomeBySource: Record<string, number>;
  weeklySpend: number;
  weeklyLimit: number;
  weeklyRatio: number;
  monthlySpend: number;
  todaySpend: number;
  typeSplit: { Need: number; Want: number; Saving: number };
  recentExpenses: Expense[];
  coinBalance: number;
  currentBalance: number;
  startingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  splitsSummary: SplitsSummaryItem[];
  lendingSummary: { totalPending: number };
};
