import { queryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";

export function invalidateDashboard() {
  return queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
}

export function invalidateExpenses() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}

export function invalidateIncome() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.income }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}

export function invalidateSavings() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.savings }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}

export function invalidateLending() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.lending }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}

export function invalidateSplits() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.splits }),
    queryClient.invalidateQueries({ queryKey: queryKeys.splitSettlements }),
    queryClient.invalidateQueries({ queryKey: queryKeys.splitPlate }),
    queryClient.invalidateQueries({ queryKey: queryKeys.flatmates }),
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}

export function invalidateSettings() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.settings }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}

export function invalidateKnowledge() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.knowledge }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
  ]);
}
