"use client";

import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { assertAuthenticated, withAuthGuard } from "@/lib/auth-guard";
import { apiFetch, ApiError } from "@/lib/api";
import { CATEGORIES, INCOME_SOURCES, PAYMENT_MODES, SAVINGS_DESTINATIONS } from "@/lib/constants";
import { inr, today } from "@/lib/format";
import {
  invalidateExpenses,
  invalidateIncome,
  invalidateLending,
  invalidateSavings,
  invalidateSplits,
} from "@/lib/query/invalidate";
import type { Flatmate } from "@/lib/types";
import { useDashboardUiStore } from "@/stores/dashboardUi";
import {
  type ParsedExpense,
  type ParsedIntent,
  useVoiceLoggerStore,
} from "@/stores/voiceLogger";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function useVoiceLogger(flatmates: Flatmate[]) {
  const triggerFlash = useDashboardUiStore((s) => s.triggerFlash);
  const store = useVoiceLoggerStore();

  const fillExpenseForm = useCallback((p: ParsedExpense) => {
    store.setExpenseForm({
      date: p.date || today(),
      description: p.description || "",
      category: CATEGORIES.includes(p.category as (typeof CATEGORIES)[number]) ? p.category! : CATEGORIES[0],
      amount: p.amount != null ? String(p.amount) : "",
      paymentMode: PAYMENT_MODES.includes(p.paymentMode as (typeof PAYMENT_MODES)[number]) ? p.paymentMode! : PAYMENT_MODES[0],
      notes: p.notes || "",
    });
  }, [store]);

  const parseMutation = useMutation({
    mutationFn: withAuthGuard((text: string) =>
      apiFetch<ParsedIntent>("/api/parse", { method: "POST", body: JSON.stringify({ text }) })),
    onMutate: () => {
      store.setAgentError(null);
      store.setAppState("PARSING");
    },
    onSuccess: (res: ParsedIntent) => {
      store.setIntentData(res);
      if (res.intent === "expense") {
        fillExpenseForm(res.data);
      } else if (res.intent === "split_expense") {
        fillExpenseForm(res.data);
        const matched = res.data.matchedFlatmates ?? [];
        store.setUnmatchedFlatmates(res.data.unmatchedFlatmates ?? []);
        const ids = matched.map((f) => f.id);
        store.setSplitFlatmateIds(ids);
        const total = res.data.amount ?? 0;
        const per = ids.length > 0 ? round2(total / (ids.length + 1)) : 0;
        const shares: Record<string, string> = {};
        ids.forEach((id) => {
          shares[id] = String(per);
        });
        store.setSplitShares(shares);
      } else if (res.intent === "income") {
        const p = res.data;
        store.setIncomeForm({
          date: p.date || today(),
          source: INCOME_SOURCES.includes(p.source as (typeof INCOME_SOURCES)[number]) ? p.source! : INCOME_SOURCES[0],
          amount: p.amount != null ? String(p.amount) : "",
          notes: p.notes || "",
        });
      } else if (res.intent === "lending") {
        const p = res.data;
        store.setLendingForm({
          date: p.date || today(),
          personName: p.personName || "",
          amount: p.amount != null ? String(p.amount) : "",
          reason: p.reason || "",
        });
      } else if (res.intent === "savings") {
        const p = res.data;
        store.setSavingsForm({
          date: p.date || today(),
          kind: p.kind === "saved" ? "saved" : "invested",
          amount: p.amount != null ? String(p.amount) : "",
          destination:
            p.destination && SAVINGS_DESTINATIONS.includes(p.destination as (typeof SAVINGS_DESTINATIONS)[number])
              ? p.destination
              : SAVINGS_DESTINATIONS[0],
          reason: p.reason || "",
        });
      } else if (res.intent === "split_clear") {
        const p = res.data;
        store.setClearForm({
          date: p.date || today(),
          flatmateId: p.flatmateId || flatmates[0]?.id || "",
          amount: p.amount != null ? String(p.amount) : "",
          reason: p.reason || "",
        });
        store.setUnmatchedFlatmates(p.unmatched ? [p.flatmateName || ""] : []);
      }
      store.setAppState("PENDING");
    },
    onError: (e) => {
      store.setAgentError(e instanceof ApiError ? e.message : "Could not parse. Try again.");
      store.setAppState("IDLE");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      assertAuthenticated();
      const intentData = useVoiceLoggerStore.getState().intentData;
      if (!intentData) return;

      const {
        expenseForm,
        incomeForm,
        lendingForm,
        savingsForm,
        clearForm,
        splitFlatmateIds,
        splitShares,
        unmatchedFlatmates,
      } = useVoiceLoggerStore.getState();

      if (intentData.intent === "expense") {
        await apiFetch("/api/expenses", {
          method: "POST",
          body: JSON.stringify({
            date: expenseForm.date || today(),
            description: expenseForm.description,
            category: expenseForm.category,
            amount: Number(expenseForm.amount),
            paymentMode: expenseForm.paymentMode,
            notes: expenseForm.notes || undefined,
          }),
        });
        return `✓ Expense saved — ${inr(Number(expenseForm.amount))}`;
      }

      if (intentData.intent === "split_expense") {
        if (splitFlatmateIds.length === 0 || unmatchedFlatmates.length > 0) {
          throw new Error("Fix flatmate selection before saving.");
        }
        await apiFetch("/api/expenses", {
          method: "POST",
          body: JSON.stringify({
            date: expenseForm.date || today(),
            description: expenseForm.description,
            category: expenseForm.category,
            amount: Number(expenseForm.amount),
            paymentMode: expenseForm.paymentMode,
            notes: expenseForm.notes || undefined,
            split: {
              flatmateIds: splitFlatmateIds,
              shares: splitFlatmateIds.map((id) => Number(splitShares[id]) || 0),
            },
          }),
        });
        const userShare = round2(
          Number(expenseForm.amount) - splitFlatmateIds.reduce((s, id) => s + (Number(splitShares[id]) || 0), 0),
        );
        return `✓ Split expense saved — your share ${inr(userShare)}`;
      }

      if (intentData.intent === "income") {
        await apiFetch("/api/income", {
          method: "POST",
          body: JSON.stringify({
            date: incomeForm.date || today(),
            source: incomeForm.source,
            amount: Number(incomeForm.amount),
            notes: incomeForm.notes || undefined,
          }),
        });
        return `✓ Income saved — ${inr(Number(incomeForm.amount))}`;
      }

      if (intentData.intent === "lending") {
        await apiFetch("/api/lending", {
          method: "POST",
          body: JSON.stringify({
            date: lendingForm.date || today(),
            personName: lendingForm.personName,
            amount: Number(lendingForm.amount),
            reason: lendingForm.reason,
          }),
        });
        return `✓ Lending saved — ${inr(Number(lendingForm.amount))}`;
      }

      if (intentData.intent === "savings") {
        await apiFetch("/api/savings", {
          method: "POST",
          body: JSON.stringify({
            date: savingsForm.date || today(),
            kind: savingsForm.kind,
            amount: Number(savingsForm.amount),
            destination: savingsForm.destination,
            reason: savingsForm.reason,
          }),
        });
        return `✓ Savings logged — ${inr(Number(savingsForm.amount))}`;
      }

      if (intentData.intent === "split_clear") {
        if (!clearForm.flatmateId) throw new Error("Select a flatmate.");
        await apiFetch("/api/splits/settlements", {
          method: "POST",
          body: JSON.stringify({
            flatmateId: clearForm.flatmateId,
            amount: Number(clearForm.amount),
            reason: clearForm.reason,
            date: clearForm.date || today(),
            direction: "received",
          }),
        });
        return `✓ Split clear saved — ${inr(Number(clearForm.amount))}`;
      }
    },
    onSuccess: async (msg) => {
      const intent = useVoiceLoggerStore.getState().intentData?.intent;
      store.resetAfterSave();
      triggerFlash();
      if (msg) {
        store.setSuccessMsg(msg);
        setTimeout(() => store.setSuccessMsg(null), 3000);
      }
      if (intent === "expense" || intent === "split_expense") await invalidateExpenses();
      else if (intent === "income") await invalidateIncome();
      else if (intent === "lending") await invalidateLending();
      else if (intent === "savings") await invalidateSavings();
      else if (intent === "split_clear") await invalidateSplits();
    },
    onError: (e) => {
      store.setAgentError(e instanceof Error ? e.message : "Save failed.");
    },
  });

  const sendForParse = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      parseMutation.mutate(text);
    },
    [parseMutation],
  );

  const confirmSave = useCallback(() => {
    confirmMutation.mutate();
  }, [confirmMutation]);

  const cancelConfirm = useCallback(() => {
    store.resetConfirm();
    store.setAgentError("Cancelled.");
    setTimeout(() => store.setAgentError(null), 2000);
  }, [store]);

  return {
    sendForParse,
    confirmSave,
    cancelConfirm,
    parsing: parseMutation.isPending,
    saving: confirmMutation.isPending,
  };
}
