"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import {
  useDashboardQuery,
  useExpensesQuery,
  useFlatmatesQuery,
  useIncomeQuery,
  useSavingsQuery,
  useSettingsQuery,
} from "@/lib/query/hooks";

export function useAuthQueryEnabled() {
  const { isLoading: authLoading, user } = useAuth();
  return !authLoading && !!user;
}

export function useDashboardData() {
  const enabled = useAuthQueryEnabled();
  const dashboard = useDashboardQuery(enabled);
  const expenses = useExpensesQuery(enabled);
  const income = useIncomeQuery(enabled);
  const savings = useSavingsQuery(enabled);
  const settings = useSettingsQuery(enabled);
  const flatmates = useFlatmatesQuery(enabled);

  const isLoading = dashboard.isPending && !dashboard.data;
  const hasData = !!dashboard.data;

  return {
    enabled,
    dashboard: dashboard.data,
    expenses: expenses.data ?? [],
    incomes: income.data ?? [],
    savingsEntries: savings.data ?? [],
    settings: settings.data ?? null,
    flatmates: flatmates.data ?? [],
    isLoading,
    hasData,
    isFetching:
      dashboard.isFetching ||
      expenses.isFetching ||
      income.isFetching ||
      savings.isFetching,
  };
}
