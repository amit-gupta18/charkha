"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { inr, monthStr } from "@/lib/format";
import type { Expense, Settings } from "@/lib/types";
import { Alert, FieldLabel, PageCard, SectionTitle } from "@/components/ui/PageShell";
import { CreamMonthPicker } from "@/components/ui/CreamMonthPicker";

type Props = { refreshKey?: number; embedded?: boolean };

function SplitBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{inr(amount)}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill animate-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function MonthlySection({ refreshKey = 0, embedded = true }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(monthStr(new Date()));

  useEffect(() => {
    Promise.all([
      apiFetch<{ expenses: Expense[] }>("/api/expenses"),
      apiFetch<{ settings: Settings }>("/api/settings").catch(() => null),
    ])
      .then(([exp, set]) => {
        setExpenses(exp.expenses);
        setSettings(set?.settings ?? null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load monthly data."))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.slice(0, 7) === month),
    [expenses, month]
  );

  const categoryTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of monthExpenses) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  const typeSplit = useMemo(() => {
    const s = { Need: 0, Want: 0, Saving: 0 };
    for (const e of monthExpenses) s[e.type] += e.amount;
    return s;
  }, [monthExpenses]);

  const dayTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of monthExpenses) m.set(e.date, (m.get(e.date) ?? 0) + e.amount);
    return m;
  }, [monthExpenses]);

  const monthTotal = monthExpenses.reduce((a, e) => a + e.amount, 0);
  const year = Number(month.slice(0, 4));
  const dayThreshold = (settings?.weeklyLimit ?? 2500) / 7 || 1;

  const yearCells = useMemo(() => {
    const cells: { date: string; total: number; top: string }[] = [];
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31));
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      const dayExp = expenses.filter((e) => e.date === ds);
      const total = dayExp.reduce((a, e) => a + e.amount, 0);
      const topCat = (() => {
        const m = new Map<string, number>();
        for (const e of dayExp) m.set(e.category, (m.get(e.category) ?? 0) + e.amount);
        return Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      })();
      cells.push({ date: ds, total, top: topCat });
    }
    return cells;
  }, [expenses, year]);

  function cellClass(total: number) {
    if (total <= 0) return "heatmap-none";
    if (total < dayThreshold) return "heatmap-light";
    if (total < dayThreshold * 2) return "heatmap-normal";
    if (total < dayThreshold * 3) return "heatmap-high";
    return "heatmap-very";
  }

  const budget = settings?.monthlyIncome ?? 0;

  return (
    <PageCard id={embedded ? "monthly" : undefined} style={embedded ? undefined : { marginBottom: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        {embedded && <SectionTitle>Monthly report</SectionTitle>}
        {!embedded && <div />}
        <div style={{ minWidth: 160, marginLeft: embedded ? undefined : "auto" }}>
          <FieldLabel>Month</FieldLabel>
          <CreamMonthPicker value={month} onChange={setMonth} />
        </div>
      </div>
      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>Loading...</p>
      ) : (
        <>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total spend ({month})</p>
            <p style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", margin: "4px 0" }}>{inr(monthTotal)}</p>
            {budget > 0 && <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Monthly income budget: {inr(budget)}</p>}
          </div>

          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>By category</p>
          {categoryTotals.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20 }}>No spending this month.</p>
          ) : (
            <div style={{ marginBottom: 20 }}>
              {categoryTotals.map(([cat, amt]) => {
                const pct = monthTotal > 0 ? (amt / monthTotal) * 100 : 0;
                return (
                  <div key={cat} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 4 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{cat}</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{inr(amt)}</span>
                    </div>
                    <div className="progress-track" style={{ height: 6 }}>
                      <div className="progress-fill" style={{ width: `${pct}%`, background: "var(--accent)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Need / Want / Saving</p>
          <SplitBar label="Need" amount={typeSplit.Need} total={monthTotal} color="var(--blue)" />
          <SplitBar label="Want" amount={typeSplit.Want} total={monthTotal} color="var(--orange)" />
          <SplitBar label="Saving" amount={typeSplit.Saving} total={monthTotal} color="var(--green)" />

          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "16px 0 10px" }}>Daily spend</p>
          {dayTotals.size === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20 }}>No daily spending.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20, maxHeight: 200, overflowY: "auto" }}>
              {Array.from(dayTotals.entries())
                .sort((a, b) => (a[0] < b[0] ? 1 : -1))
                .map(([date, amt]) => (
                  <div key={date} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--surface)", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{inr(amt)}</span>
                  </div>
                ))}
            </div>
          )}

          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Yearly heatmap ({year})</p>
          <div style={{ display: "grid", gridAutoFlow: "column", gridTemplateRows: "repeat(7, 14px)", gap: 3, overflowX: "auto" }}>
            {yearCells.map((c) => (
              <div
                key={c.date}
                className={`heatmap-cell ${cellClass(c.total)}`}
                title={c.date + (c.total > 0 ? ` · ${inr(c.total)}${c.top ? ` · ${c.top}` : ""}` : " · no spend")}
              />
            ))}
          </div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "var(--text-muted)" }}>
            <span>Less</span>
            <span className="heatmap-cell heatmap-none" />
            <span className="heatmap-cell heatmap-light" />
            <span className="heatmap-cell heatmap-normal" />
            <span className="heatmap-cell heatmap-high" />
            <span className="heatmap-cell heatmap-very" />
            <span>More</span>
          </div>
        </>
      )}
    </PageCard>
  );
}
