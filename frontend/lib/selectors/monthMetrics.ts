import { useMemo } from "react";
import { computeMonthLedger, monthKeyAfter } from "@/lib/balance";
import { dateKey, expenseShare, isoWeekKey, monthStr, today } from "@/lib/format";
import type { DashboardData, Expense, Income, Saving, Settings } from "@/lib/types";

function formatMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function useMonthMetrics({
  selectedMonth,
  expenses,
  incomes,
  savingsEntries,
  settings,
  dashboardData,
}: {
  selectedMonth: string;
  expenses: Expense[];
  incomes: Income[];
  savingsEntries: Saving[];
  settings: Settings | null | undefined;
  dashboardData: DashboardData | null | undefined;
}) {
  const isViewingCurrentMonth = selectedMonth === monthStr(new Date());
  const weeklyLimit = settings?.weeklyLimit ?? dashboardData?.weeklyLimit ?? 2500;
  const monthlyBudget = settings?.monthlyIncome ?? dashboardData?.monthlyIncome ?? 0;

  const monthExpenses = useMemo(
    () => expenses.filter((e) => dateKey(e.date).slice(0, 7) === selectedMonth),
    [expenses, selectedMonth],
  );

  const monthIncomes = useMemo(
    () => incomes.filter((i) => dateKey(i.date).slice(0, 7) === selectedMonth),
    [incomes, selectedMonth],
  );

  const monthSpend = useMemo(
    () => monthExpenses.reduce((s, e) => s + expenseShare(e), 0),
    [monthExpenses],
  );

  const monthIncomeTotal = useMemo(
    () => monthIncomes.reduce((s, i) => s + i.amount, 0),
    [monthIncomes],
  );

  const monthInvested = useMemo(
    () =>
      savingsEntries
        .filter((s) => dateKey(s.date).slice(0, 7) === selectedMonth && s.kind === "invested")
        .reduce((sum, s) => sum + s.amount, 0),
    [savingsEntries, selectedMonth],
  );

  const monthSaved = useMemo(
    () =>
      savingsEntries
        .filter((s) => dateKey(s.date).slice(0, 7) === selectedMonth && s.kind === "saved")
        .reduce((sum, s) => sum + s.amount, 0),
    [savingsEntries, selectedMonth],
  );

  const monthSavingsTotal = monthInvested + monthSaved;

  const monthTypeSplit = useMemo(() => {
    const split = { Need: 0, Want: 0 };
    for (const e of monthExpenses) {
      if (e.type === "Need") split.Need += expenseShare(e);
      else split.Want += expenseShare(e);
    }
    return split;
  }, [monthExpenses]);

  const categorySegments = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of monthExpenses) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + expenseShare(e));
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
  }, [monthExpenses]);

  const weeklyBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of monthExpenses) {
      const k = isoWeekKey(e.date);
      map.set(k, (map.get(k) ?? 0) + expenseShare(e));
    }
    const currentKey = isViewingCurrentMonth ? isoWeekKey(today()) : "";
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => ({
        label: key.split("-W")[1] ? `W${key.split("-W")[1]}` : key,
        value,
        highlight: key === currentKey,
      }));
  }, [monthExpenses, isViewingCurrentMonth]);

  const monthBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const k = dateKey(e.date).slice(0, 7);
      map.set(k, (map.get(k) ?? 0) + expenseShare(e));
    }
    const [year, month] = selectedMonth.split("-").map(Number);
    const items = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const k = monthStr(d);
      items.push({
        label: d.toLocaleDateString("en-IN", { month: "short" }),
        value: map.get(k) ?? 0,
        highlight: k === selectedMonth,
      });
    }
    return items;
  }, [expenses, selectedMonth]);

  const recentThree = useMemo(
    () =>
      [...monthExpenses]
        .sort((a, b) => dateKey(b.date).localeCompare(dateKey(a.date)))
        .slice(0, 3),
    [monthExpenses],
  );

  const dayThreshold = weeklyLimit / 7 || 1;

  const monthLedger = useMemo(
    () =>
      computeMonthLedger(
        selectedMonth,
        settings?.startingBalance ?? dashboardData?.startingBalance ?? 0,
        incomes,
        expenses,
        savingsEntries.map((s) => ({
          date: dateKey(s.date),
          amount: s.amount,
          status: s.status,
          withdrawnAt: s.withdrawnAt ? dateKey(String(s.withdrawnAt)) : null,
        })),
      ),
    [selectedMonth, settings?.startingBalance, dashboardData?.startingBalance, incomes, expenses, savingsEntries],
  );

  const prevMonthLabel = monthLedger.prevMonthKey ? formatMonthLabel(monthLedger.prevMonthKey) : null;
  const nextMonthLabel = formatMonthLabel(monthKeyAfter(selectedMonth));
  const monthLabel = formatMonthLabel(selectedMonth);

  const typeSegments = useMemo(
    () => [
      { label: "Need", value: monthTypeSplit.Need, color: "var(--blue)" },
      { label: "Want", value: monthTypeSplit.Want, color: "var(--orange)" },
      ...(monthInvested > 0 ? [{ label: "Invested", value: monthInvested, color: "var(--green)" }] : []),
      ...(monthSaved > 0 ? [{ label: "Saved", value: monthSaved, color: "var(--accent)" }] : []),
    ],
    [monthTypeSplit, monthInvested, monthSaved],
  );

  return {
    isViewingCurrentMonth,
    weeklyLimit,
    monthlyBudget,
    monthExpenses,
    monthIncomes,
    monthSpend,
    monthIncomeTotal,
    monthInvested,
    monthSaved,
    monthSavingsTotal,
    monthTypeSplit,
    categorySegments,
    weeklyBars,
    monthBars,
    recentThree,
    dayThreshold,
    monthLedger,
    prevMonthLabel,
    nextMonthLabel,
    monthLabel,
    typeSegments,
  };
}
