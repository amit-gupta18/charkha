"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { inr, isoWeekKey, expenseShare } from "@/lib/format";
import type { Expense, Settings } from "@/lib/types";
import { Alert, PageCard, SectionTitle } from "@/components/ui/PageShell";

type Props = { refreshKey?: number; embedded?: boolean };

export function WeeklySection({ refreshKey = 0, embedded = true }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ expenses: Expense[] }>("/api/expenses"),
      apiFetch<{ settings: Settings }>("/api/settings").catch(() => null),
    ])
      .then(([exp, set]) => {
        setExpenses(exp.expenses);
        setSettings(set?.settings ?? null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load weekly data."))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const limit = settings?.weeklyLimit ?? 2500;

  const weeks = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      const k = isoWeekKey(e.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return Array.from(map.entries())
      .map(([key, items]) => ({
        key,
        total: items.reduce((s, e) => s + expenseShare(e), 0),
        items,
        byCategory: Object.entries(
          items.reduce<Record<string, number>>((acc, e) => {
            acc[e.category] = (acc[e.category] ?? 0) + expenseShare(e);
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1]),
      }))
      .sort((a, b) => (a.key < b.key ? 1 : -1))
      .slice(0, 8);
  }, [expenses]);

  const currentKey = isoWeekKey(new Date().toISOString().slice(0, 10));
  const currentWeek = weeks.find((w) => w.key === currentKey);
  const currentWeekSpend = currentWeek?.total ?? 0;
  const ratio = limit > 0 ? currentWeekSpend / limit : 0;
  const weeklyPct = Math.min(100, ratio * 100);

  return (
    <PageCard id={embedded ? "weekly" : undefined} style={embedded ? undefined : { marginBottom: 0 }}>
      {embedded && <SectionTitle>Weekly analysis</SectionTitle>}
      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>Loading...</p>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>This week</p>
              <p style={{ fontSize: "1.8rem", fontWeight: 800, color: ratio > 1 ? "var(--red)" : "var(--text-primary)", margin: "4px 0" }}>{inr(currentWeekSpend)}</p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>of {inr(limit)} limit ({Math.round(ratio * 100)}%)</p>
            </div>
            <span className={`badge ${ratio > 1 ? "badge-red" : "badge-green"}`}>
              {ratio > 1 ? "Over budget" : "Under budget"}
            </span>
          </div>
          <div className="progress-track" style={{ height: 12, marginBottom: 20 }}>
            <div className="progress-fill animate-bar" style={{ width: `${weeklyPct}%`, background: ratio > 1 ? "var(--red)" : "var(--green)" }} />
          </div>

          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Last 8 weeks</p>
          {weeks.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No spending recorded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {weeks.map((w) => {
                const over = limit > 0 && w.total > limit;
                const open = expandedWeek === w.key;
                return (
                  <div key={w.key} style={{ border: "1px solid var(--border-light)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                    <button
                      type="button"
                      onClick={() => setExpandedWeek(open ? null : w.key)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 14px", background: open ? "var(--parchment)" : "transparent",
                        border: "none", cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>{w.key}</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: over ? "var(--red)" : "var(--text-primary)" }}>
                        {inr(w.total)} {over ? "⚠" : ""}
                      </span>
                    </button>
                    {open && w.byCategory.length > 0 && (
                      <div style={{ padding: "8px 14px 12px", borderTop: "1px solid var(--border-light)", background: "var(--surface)" }}>
                        {w.byCategory.map(([cat, amt]) => (
                          <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", padding: "3px 0", color: "var(--text-muted)" }}>
                            <span>{cat}</span><span>{inr(amt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </PageCard>
  );
}
