"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useExpensesQuery, useSettingsQuery } from "@/lib/query/hooks";
import { useAuthQueryEnabled } from "@/hooks/useDashboardData";
import { dateKey, expenseShare, inr, monthStr } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { Alert, FieldLabel, PageCard, SectionTitle } from "@/components/ui/PageShell";
import { CreamMonthPicker } from "@/components/ui/CreamMonthPicker";

type Props = { embedded?: boolean };

type HeatmapCell = { date: string; total: number; top: string };

type HeatmapMonth = {
  key: string;
  label: string;
  weeks: (HeatmapCell | null)[][];
};

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

function padWeekColumn(days: (HeatmapCell | null)[]) {
  const column = [...days];
  while (column.length < 7) column.push(null);
  return column.slice(0, 7);
}

function buildMonthHeatmap(
  year: number,
  monthIndex: number,
  dayData: Map<string, { total: number; top: string }>,
): HeatmapMonth {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leadingBlanks = first.getUTCDay();

  const flatDays: (HeatmapCell | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) flatDays.push(null);

  for (let day = 1; day <= daysInMonth; day++) {
    const ds = `${monthKey}-${String(day).padStart(2, "0")}`;
    const info = dayData.get(ds);
    flatDays.push({
      date: ds,
      total: info?.total ?? 0,
      top: info?.top ?? "",
    });
  }

  const weeks: (HeatmapCell | null)[][] = [];
  for (let i = 0; i < flatDays.length; i += 7) {
    weeks.push(padWeekColumn(flatDays.slice(i, i + 7)));
  }

  return {
    key: monthKey,
    label: new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }),
    weeks,
  };
}

export function MonthlySection({ embedded = true }: Props) {
  const enabled = useAuthQueryEnabled();
  const { data: expenses = [], isLoading: expensesLoading } = useExpensesQuery(enabled);
  const { data: settings = null, isLoading: settingsLoading } = useSettingsQuery(enabled);
  const loading = expensesLoading || settingsLoading;
  const [error] = useState<string | null>(null);
  const [month, setMonth] = useState(monthStr(new Date()));
  const heatmapScrollRef = useRef<HTMLDivElement>(null);

  const dayData = useMemo(() => {
    const byDate = new Map<string, Map<string, number>>();

    for (const expense of expenses) {
      const key = dateKey(expense.date);
      const categories = byDate.get(key) ?? new Map<string, number>();
      categories.set(expense.category, (categories.get(expense.category) ?? 0) + expenseShare(expense));
      byDate.set(key, categories);
    }

    const result = new Map<string, { total: number; top: string }>();
    for (const [date, categories] of byDate) {
      const total = Array.from(categories.values()).reduce((sum, amount) => sum + amount, 0);
      const top = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
      result.set(date, { total, top });
    }

    return result;
  }, [expenses]);

  const monthExpenses = useMemo(
    () => expenses.filter((e) => dateKey(e.date).slice(0, 7) === month),
    [expenses, month],
  );

  const categoryTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of monthExpenses) m.set(e.category, (m.get(e.category) ?? 0) + expenseShare(e));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  const typeSplit = useMemo(() => {
    const s = { Need: 0, Want: 0, Saving: 0 };
    for (const e of monthExpenses) s[e.type] += expenseShare(e);
    return s;
  }, [monthExpenses]);

  const dayTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of monthExpenses) {
      const key = dateKey(e.date);
      m.set(key, (m.get(key) ?? 0) + expenseShare(e));
    }
    return m;
  }, [monthExpenses]);

  const monthTotal = monthExpenses.reduce((a, e) => a + expenseShare(e), 0);
  const year = Number(month.slice(0, 4));
  const dayThreshold = (settings?.weeklyLimit ?? 2500) / 7 || 1;

  const heatmapMonths = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    const lastMonthIndex = year < currentYear ? 11 : year > currentYear ? -1 : currentMonthIndex;

    const months: HeatmapMonth[] = [];
    for (let monthIndex = 0; monthIndex <= lastMonthIndex; monthIndex++) {
      months.push(buildMonthHeatmap(year, monthIndex, dayData));
    }
    return months;
  }, [dayData, year]);

  useEffect(() => {
    const container = heatmapScrollRef.current;
    if (!container) return;

    const target = container.querySelector<HTMLElement>(`[data-month="${month}"]`);
    if (target) {
      target.scrollIntoView({ inline: "end", block: "nearest", behavior: "smooth" });
      return;
    }

    container.scrollLeft = container.scrollWidth - container.clientWidth;
  }, [month, heatmapMonths]);

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

          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Need / Want / Saving (spend)</p>
          <SplitBar label="Need" amount={typeSplit.Need} total={monthTotal} color="var(--blue)" />
          <SplitBar label="Want" amount={typeSplit.Want} total={monthTotal} color="var(--orange)" />
          <SplitBar label="Saving" amount={typeSplit.Saving} total={monthTotal} color="var(--green)" />
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 8 }}>
            Actual investments & savings are tracked on the <a href="/savings" style={{ color: "var(--accent)", fontWeight: 600 }}>Savings</a> page.
          </p>

          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "16px 0 10px" }}>Daily spend</p>
          {dayTotals.size === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20 }}>No daily spending.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20, maxHeight: 200, overflowY: "auto" }}>
              {Array.from(dayTotals.entries())
                .sort((a, b) => (a[0] < b[0] ? 1 : -1))
                .map(([date, amt]) => (
                  <div key={date} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--surface)", fontSize: "0.85rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{new Date(date + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{inr(amt)}</span>
                  </div>
                ))}
            </div>
          )}

          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
            Yearly heatmap ({year})
          </p>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 8 }}>
            Scroll left for earlier months. Showing through{" "}
            {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", timeZone: "UTC" })}.
          </p>

          {heatmapMonths.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20 }}>No heatmap data for this year yet.</p>
          ) : (
            <div ref={heatmapScrollRef} className="heatmap-scroll">
              <div className="heatmap-months">
                {heatmapMonths.map((monthBlock) => (
                  <div key={monthBlock.key} className="heatmap-month-block" data-month={monthBlock.key}>
                    <p className={`heatmap-month-label${monthBlock.key === month ? " is-current" : ""}`}>
                      {monthBlock.label}
                    </p>
                    <div className="heatmap-week-columns">
                      {monthBlock.weeks.map((week, weekIndex) => (
                        <div key={`${monthBlock.key}-w${weekIndex}`} className="heatmap-week-column">
                          {week.map((cell, dayIndex) =>
                            cell ? (
                              <div
                                key={cell.date}
                                className={`heatmap-cell ${cellClass(cell.total)}`}
                                title={
                                  cell.date +
                                  (cell.total > 0 ? ` · ${inr(cell.total)}${cell.top ? ` · ${cell.top}` : ""}` : " · no spend")
                                }
                              />
                            ) : (
                              <div key={`${monthBlock.key}-e-${weekIndex}-${dayIndex}`} className="heatmap-cell heatmap-empty" />
                            ),
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
