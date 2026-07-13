import { dateKey, monthStr } from "./format";

export type MonthLedger = {
  opening: number;
  income: number;
  expenses: number;
  savings: number;
  withdrawals: number;
  closing: number;
  prevMonthKey: string | null;
};

export type LedgerSaving = {
  date: string;
  amount: number;
  status: "active" | "withdrawn";
  withdrawnAt?: string | null;
};

export function monthKeyBefore(monthKey: string): string | null {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return null;
  return monthStr(new Date(y, m - 2, 1));
}

export function monthKeyAfter(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return monthStr(new Date(y, m, 1));
}

function inMonth(date: string, monthKey: string) {
  return dateKey(date).slice(0, 7) === monthKey;
}

function beforeMonth(date: string, monthKey: string) {
  return dateKey(date).slice(0, 7) < monthKey;
}

function netDeltaBeforeMonth(
  monthKey: string,
  baseline: number,
  incomes: { date: string; amount: number }[],
  expenses: { date: string; amount: number }[],
  savings: LedgerSaving[],
) {
  let balance = baseline;
  for (const income of incomes) {
    if (beforeMonth(income.date, monthKey)) balance += income.amount;
  }
  for (const expense of expenses) {
    if (beforeMonth(expense.date, monthKey)) balance -= expense.amount;
  }
  for (const saving of savings) {
    if (beforeMonth(saving.date, monthKey)) balance -= saving.amount;
    if (saving.status === "withdrawn" && saving.withdrawnAt && beforeMonth(saving.withdrawnAt, monthKey)) {
      balance += saving.amount;
    }
  }
  return balance;
}

/** Account balance flow for one month. Opening = previous month's closing. */
export function computeMonthLedger(
  monthKey: string,
  baseline: number,
  incomes: { date: string; amount: number }[],
  expenses: { date: string; amount: number }[],
  savings: LedgerSaving[] = [],
): MonthLedger {
  const opening = netDeltaBeforeMonth(monthKey, baseline, incomes, expenses, savings);

  const income = incomes.filter((i) => inMonth(i.date, monthKey)).reduce((sum, i) => sum + i.amount, 0);
  const expensesTotal = expenses.filter((e) => inMonth(e.date, monthKey)).reduce((sum, e) => sum + e.amount, 0);
  const savingsOut = savings.filter((s) => inMonth(s.date, monthKey)).reduce((sum, s) => sum + s.amount, 0);
  const withdrawals = savings
    .filter((s) => s.status === "withdrawn" && s.withdrawnAt && inMonth(s.withdrawnAt, monthKey))
    .reduce((sum, s) => sum + s.amount, 0);

  const closing = opening + income - expensesTotal - savingsOut + withdrawals;

  return {
    opening,
    income,
    expenses: expensesTotal,
    savings: savingsOut,
    withdrawals,
    closing,
    prevMonthKey: monthKeyBefore(monthKey),
  };
}
