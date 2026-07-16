import { create } from "zustand";
import { CATEGORIES, INCOME_SOURCES, PAYMENT_MODES, SAVINGS_DESTINATIONS, SAVINGS_KINDS } from "@/lib/constants";
import { today } from "@/lib/format";
import type { Flatmate } from "@/lib/types";

export type ParsedExpense = {
  date: string | null;
  description: string | null;
  category: string | null;
  amount: number | null;
  paymentMode: string | null;
  notes?: string | null;
};

export type ParsedSplitExpense = ParsedExpense & {
  matchedFlatmates?: Flatmate[];
  unmatchedFlatmates?: string[];
};

export type ParsedIncome = {
  date: string | null;
  source: string | null;
  amount: number | null;
  notes?: string | null;
};

export type ParsedLending = {
  personName: string | null;
  amount: number | null;
  reason?: string | null;
  date: string | null;
};

export type ParsedSaving = {
  kind: "invested" | "saved" | null;
  amount: number | null;
  destination?: string | null;
  reason?: string | null;
  date: string | null;
};

export type ParsedSplitClear = {
  flatmateId: string | null;
  flatmateName: string | null;
  amount: number | null;
  reason?: string | null;
  date: string | null;
  unmatched?: boolean;
};

export type ParsedIntent =
  | { intent: "expense"; data: ParsedExpense }
  | { intent: "split_expense"; data: ParsedSplitExpense }
  | { intent: "income"; data: ParsedIncome }
  | { intent: "lending"; data: ParsedLending }
  | { intent: "savings"; data: ParsedSaving }
  | { intent: "split_clear"; data: ParsedSplitClear };

export type VoiceAppState = "IDLE" | "PARSING" | "PENDING";

type ExpenseForm = {
  date: string;
  description: string;
  category: string;
  amount: string;
  paymentMode: string;
  notes: string;
};

type IncomeForm = { date: string; source: string; amount: string; notes: string };
type LendingForm = { date: string; personName: string; amount: string; reason: string };
type SavingsForm = { date: string; kind: string; amount: string; destination: string; reason: string };
type ClearForm = { date: string; flatmateId: string; amount: string; reason: string };

const defaultExpenseForm = (): ExpenseForm => ({
  date: today(),
  description: "",
  category: CATEGORIES[0],
  amount: "",
  paymentMode: PAYMENT_MODES[0],
  notes: "",
});

const defaultIncomeForm = (): IncomeForm => ({
  date: today(),
  source: INCOME_SOURCES[0],
  amount: "",
  notes: "",
});

const defaultLendingForm = (): LendingForm => ({
  date: today(),
  personName: "",
  amount: "",
  reason: "",
});

const defaultSavingsForm = (): SavingsForm => ({
  date: today(),
  kind: SAVINGS_KINDS[0],
  amount: "",
  destination: SAVINGS_DESTINATIONS[0],
  reason: "",
});

const defaultClearForm = (): ClearForm => ({
  date: today(),
  flatmateId: "",
  amount: "",
  reason: "",
});

type VoiceLoggerState = {
  agentText: string;
  listening: boolean;
  interim: string;
  agentError: string | null;
  successMsg: string | null;
  intentData: ParsedIntent | null;
  appState: VoiceAppState;
  expenseForm: ExpenseForm;
  incomeForm: IncomeForm;
  lendingForm: LendingForm;
  savingsForm: SavingsForm;
  clearForm: ClearForm;
  splitFlatmateIds: string[];
  splitShares: Record<string, string>;
  unmatchedFlatmates: string[];
  setAgentText: (text: string) => void;
  setListening: (listening: boolean) => void;
  setInterim: (interim: string) => void;
  setAgentError: (error: string | null) => void;
  setSuccessMsg: (msg: string | null) => void;
  setIntentData: (intent: ParsedIntent | null) => void;
  setAppState: (state: VoiceAppState) => void;
  setExpenseForm: (updater: ExpenseForm | ((prev: ExpenseForm) => ExpenseForm)) => void;
  setIncomeForm: (updater: IncomeForm | ((prev: IncomeForm) => IncomeForm)) => void;
  setLendingForm: (updater: LendingForm | ((prev: LendingForm) => LendingForm)) => void;
  setSavingsForm: (updater: SavingsForm | ((prev: SavingsForm) => SavingsForm)) => void;
  setClearForm: (updater: ClearForm | ((prev: ClearForm) => ClearForm)) => void;
  setSplitFlatmateIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setSplitShares: (shares: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setUnmatchedFlatmates: (names: string[]) => void;
  resetAfterSave: () => void;
  resetConfirm: () => void;
};

export const useVoiceLoggerStore = create<VoiceLoggerState>((set) => ({
  agentText: "",
  listening: false,
  interim: "",
  agentError: null,
  successMsg: null,
  intentData: null,
  appState: "IDLE",
  expenseForm: defaultExpenseForm(),
  incomeForm: defaultIncomeForm(),
  lendingForm: defaultLendingForm(),
  savingsForm: defaultSavingsForm(),
  clearForm: defaultClearForm(),
  splitFlatmateIds: [],
  splitShares: {},
  unmatchedFlatmates: [],
  setAgentText: (text) => set({ agentText: text }),
  setListening: (listening) => set({ listening }),
  setInterim: (interim) => set({ interim }),
  setAgentError: (agentError) => set({ agentError }),
  setSuccessMsg: (successMsg) => set({ successMsg }),
  setIntentData: (intentData) => set({ intentData }),
  setAppState: (appState) => set({ appState }),
  setExpenseForm: (updater) =>
    set((s) => ({ expenseForm: typeof updater === "function" ? updater(s.expenseForm) : updater })),
  setIncomeForm: (updater) =>
    set((s) => ({ incomeForm: typeof updater === "function" ? updater(s.incomeForm) : updater })),
  setLendingForm: (updater) =>
    set((s) => ({ lendingForm: typeof updater === "function" ? updater(s.lendingForm) : updater })),
  setSavingsForm: (updater) =>
    set((s) => ({ savingsForm: typeof updater === "function" ? updater(s.savingsForm) : updater })),
  setClearForm: (updater) =>
    set((s) => ({ clearForm: typeof updater === "function" ? updater(s.clearForm) : updater })),
  setSplitFlatmateIds: (updater) =>
    set((s) => ({ splitFlatmateIds: typeof updater === "function" ? updater(s.splitFlatmateIds) : updater })),
  setSplitShares: (updater) =>
    set((s) => ({ splitShares: typeof updater === "function" ? updater(s.splitShares) : updater })),
  setUnmatchedFlatmates: (unmatchedFlatmates) => set({ unmatchedFlatmates }),
  resetAfterSave: () =>
    set({
      intentData: null,
      agentText: "",
      appState: "IDLE",
      splitFlatmateIds: [],
      splitShares: {},
      unmatchedFlatmates: [],
    }),
  resetConfirm: () =>
    set({
      intentData: null,
      appState: "IDLE",
      agentText: "",
    }),
}));
