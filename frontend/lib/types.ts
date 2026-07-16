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
  expenseId: string | null;
  splitBillId: string | null;
  flatmateId: string;
  amountOwed: number;
  amountSettled: number;
  amountPending: number;
  status: "pending" | "settled";
  entryType: "receivable" | "payable";
  flatmate?: Flatmate | null;
};

export type SplitBill = {
  id: string;
  date: string;
  description: string;
  totalAmount: number;
  userShare: number;
  paidBy: string;
  expenseId: string | null;
};

export type SplitRecord = {
  bill: SplitBill;
  members: SplitMember[];
  expense: Expense | null;
};

export type PlateData = {
  perFlatmate: PlateBalance[];
  totalReceivable: number;
  totalPayable: number;
  netTotal: number;
};

export type PlateBalance = {
  flatmateId: string;
  name: string;
  theyOweYou: number;
  youOweThem: number;
  netBalance: number;
};

export type SplitSettlement = {
  id: string;
  flatmateId: string;
  flatmateName?: string;
  amount: number;
  reason: string;
  date: string;
  direction: "received" | "paid";
};

export type Lending = {
  id: string;
  personName: string;
  amount: number;
  reason: string;
  date: string;
  status: "pending" | "settled";
};

export type Saving = {
  id: string;
  kind: "invested" | "saved";
  amount: number;
  destination: string;
  reason: string;
  date: string;
  status: "active" | "withdrawn";
  withdrawnAt?: string | null;
};

export type SavingsSummary = {
  totalActive: number;
  totalInvested: number;
  totalSaved: number;
};

export type SplitsSummaryItem = {
  flatmateId: string;
  name: string;
  pendingTotal: number;
  theyOweYou?: number;
  youOweThem?: number;
  netBalance?: number;
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
  monthlySavings?: number;
  totalActiveSavings?: number;
  recentExpenses: Expense[];
  coinBalance: number;
  currentBalance: number;
  startingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  splitsSummary: SplitsSummaryItem[];
  splitsNetTotal?: number;
  splitsReceivable?: number;
  splitsPayable?: number;
  lendingSummary: { totalPending: number };
  savingsSummary?: SavingsSummary;
};
