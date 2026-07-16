"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { withAuthGuard } from "@/lib/auth-guard";
import { apiFetch } from "@/lib/api";
import { queryClient } from "@/lib/query/client";
import { queryKeys } from "@/lib/query/keys";
import { selectItemField, selectListField, selectSettings } from "@/lib/query/selectors";
import {
  invalidateExpenses,
  invalidateIncome,
  invalidateKnowledge,
  invalidateLending,
  invalidateSavings,
  invalidateSettings,
  invalidateSplits,
} from "@/lib/query/invalidate";
import type {
  DashboardData,
  Expense,
  Flatmate,
  Income,
  KnowledgeNote,
  Lending,
  PlateData,
  Saving,
  Settings,
  SplitRecord,
  SplitSettlement,
} from "@/lib/types";

export function useDashboardQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => apiFetch<DashboardData>("/api/dashboard"),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useExpensesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.expenses,
    queryFn: () => apiFetch<{ expenses: Expense[] }>("/api/expenses"),
    enabled,
    select: selectListField<Expense, "expenses">("expenses"),
  });
}

export function useIncomeQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.income,
    queryFn: () => apiFetch<{ incomes: Income[] }>("/api/income"),
    enabled,
    select: selectListField<Income, "incomes">("incomes"),
  });
}

export function useSavingsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.savings,
    queryFn: () => apiFetch<{ savings: Saving[] }>("/api/savings"),
    enabled,
    select: selectListField<Saving, "savings">("savings"),
  });
}

export function useSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => apiFetch<{ settings: Settings }>("/api/settings"),
    enabled,
    select: selectSettings,
  });
}

export function useFlatmatesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.flatmates,
    queryFn: () => apiFetch<{ flatmates: Flatmate[] }>("/api/flatmates"),
    enabled,
    select: selectListField<Flatmate, "flatmates">("flatmates"),
  });
}

export function useLendingQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.lending,
    queryFn: () => apiFetch<{ lendings: Lending[] }>("/api/lending"),
    enabled,
    select: selectListField<Lending, "lendings">("lendings"),
  });
}

export function useSplitsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.splits,
    queryFn: () => apiFetch<{ splits: SplitRecord[] }>("/api/splits"),
    enabled,
    select: selectListField<SplitRecord, "splits">("splits"),
  });
}

export function useSplitSettlementsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.splitSettlements,
    queryFn: () => apiFetch<{ settlements: SplitSettlement[] }>("/api/splits/settlements"),
    enabled,
    select: selectListField<SplitSettlement, "settlements">("settlements"),
  });
}

export function useSplitPlateQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.splitPlate,
    queryFn: () => apiFetch<PlateData>("/api/splits/plate"),
    enabled,
  });
}

export function useKnowledgeQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.knowledge,
    queryFn: () => apiFetch<{ notes: KnowledgeNote[] }>("/api/knowledge"),
    enabled,
    select: selectListField<KnowledgeNote, "notes">("notes"),
  });
}

export function useKnowledgeDetailQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.knowledgeDetail(id),
    queryFn: () => apiFetch<{ note: KnowledgeNote }>(`/api/knowledge/${id}`),
    enabled: enabled && !!id,
    select: selectItemField<KnowledgeNote, "note">("note"),
  });
}

export function useDeleteExpenseMutation() {
  return useMutation({
    mutationFn: withAuthGuard((id: string) => apiFetch(`/api/expenses/${id}`, { method: "DELETE" })),
    onSuccess: () => invalidateExpenses(),
  });
}

export function useUpdateExpenseMutation() {
  return useMutation({
    mutationFn: withAuthGuard(({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch<Expense>(`/api/expenses/${id}`, { method: "PUT", body: JSON.stringify(body) })),
    onSuccess: () => invalidateExpenses(),
  });
}

export function useCreateExpenseMutation() {
  return useMutation({
    mutationFn: withAuthGuard((body: Record<string, unknown>) =>
      apiFetch("/api/expenses", { method: "POST", body: JSON.stringify(body) })),
    onSuccess: () => invalidateExpenses(),
  });
}

export function useCreateIncomeMutation() {
  return useMutation({
    mutationFn: withAuthGuard((body: Record<string, unknown>) =>
      apiFetch("/api/income", { method: "POST", body: JSON.stringify(body) })),
    onSuccess: () => invalidateIncome(),
  });
}

export function useDeleteIncomeMutation() {
  return useMutation({
    mutationFn: withAuthGuard((id: string) => apiFetch(`/api/income/${id}`, { method: "DELETE" })),
    onSuccess: () => invalidateIncome(),
  });
}

export function useCreateSavingsMutation() {
  return useMutation({
    mutationFn: withAuthGuard((body: Record<string, unknown>) =>
      apiFetch("/api/savings", { method: "POST", body: JSON.stringify(body) })),
    onSuccess: () => invalidateSavings(),
  });
}

export function useUpdateSavingsMutation() {
  return useMutation({
    mutationFn: withAuthGuard(({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/api/savings/${id}`, { method: "PUT", body: JSON.stringify(body) })),
    onSuccess: () => invalidateSavings(),
  });
}

export function useDeleteSavingsMutation() {
  return useMutation({
    mutationFn: withAuthGuard((id: string) => apiFetch(`/api/savings/${id}`, { method: "DELETE" })),
    onSuccess: () => invalidateSavings(),
  });
}

export function useCreateLendingMutation() {
  return useMutation({
    mutationFn: withAuthGuard((body: Record<string, unknown>) =>
      apiFetch("/api/lending", { method: "POST", body: JSON.stringify(body) })),
    onSuccess: () => invalidateLending(),
  });
}

export function useUpdateLendingMutation() {
  return useMutation({
    mutationFn: withAuthGuard(({ id, body }: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/api/lending/${id}`, { method: "PUT", body: JSON.stringify(body) })),
    onSuccess: () => invalidateLending(),
  });
}

export function useDeleteLendingMutation() {
  return useMutation({
    mutationFn: withAuthGuard((id: string) => apiFetch(`/api/lending/${id}`, { method: "DELETE" })),
    onSuccess: () => invalidateLending(),
  });
}

export function useUpdateSettingsMutation() {
  return useMutation({
    mutationFn: withAuthGuard((body: Settings) =>
      apiFetch<{ settings: Settings }>("/api/settings", { method: "PUT", body: JSON.stringify(body) })),
    onSuccess: () => invalidateSettings(),
  });
}

export function useCreateFlatmateMutation() {
  return useMutation({
    mutationFn: withAuthGuard((body: Record<string, unknown>) =>
      apiFetch("/api/flatmates", { method: "POST", body: JSON.stringify(body) })),
    onSuccess: () => invalidateSplits(),
  });
}

export function useDeleteFlatmateMutation() {
  return useMutation({
    mutationFn: withAuthGuard((id: string) => apiFetch(`/api/flatmates/${id}`, { method: "DELETE" })),
    onSuccess: () => invalidateSplits(),
  });
}

export function useCreateSplitBillMutation() {
  return useMutation({
    mutationFn: withAuthGuard((body: Record<string, unknown>) =>
      apiFetch("/api/splits/bills", { method: "POST", body: JSON.stringify(body) })),
    onSuccess: () => invalidateSplits(),
  });
}

export function useCreateSplitSettlementMutation() {
  return useMutation({
    mutationFn: withAuthGuard((body: Record<string, unknown>) =>
      apiFetch("/api/splits/settlements", { method: "POST", body: JSON.stringify(body) })),
    onSuccess: () => invalidateSplits(),
  });
}

export function useDeleteSplitSettlementMutation() {
  return useMutation({
    mutationFn: withAuthGuard((id: string) => apiFetch(`/api/splits/settlements/${id}`, { method: "DELETE" })),
    onSuccess: () => invalidateSplits(),
  });
}

export function useSettleSplitMemberMutation() {
  return useMutation({
    mutationFn: withAuthGuard((memberId: string) =>
      apiFetch(`/api/splits/members/${memberId}/settle`, { method: "PATCH" })),
    onSuccess: () => invalidateSplits(),
  });
}

export function useCreateKnowledgeMutation() {
  return useMutation({
    mutationFn: withAuthGuard((body: Record<string, unknown>) =>
      apiFetch("/api/knowledge", { method: "POST", body: JSON.stringify(body) })),
    onSuccess: () => invalidateKnowledge(),
  });
}

export function useUpdateKnowledgeMutation() {
  return useMutation({
    mutationFn: withAuthGuard<{ id: string; body: Record<string, unknown> }, KnowledgeNote>(
      ({ id, body }) =>
        apiFetch<KnowledgeNote>(`/api/knowledge/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    ),
    onSuccess: async (_data, vars) => {
      await invalidateKnowledge();
      await queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeDetail(vars.id) });
    },
  });
}

export function useDeleteKnowledgeMutation() {
  return useMutation({
    mutationFn: withAuthGuard((id: string) => apiFetch(`/api/knowledge/${id}`, { method: "DELETE" })),
    onSuccess: () => invalidateKnowledge(),
  });
}
