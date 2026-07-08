"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Expense, Settings } from "@/lib/types";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const monthStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export default function MonthlyPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(monthStr(new Date()));

  useEffect(() => {
    Promise.all([
      apiFetch<{ expenses: Expense[] }>("/api/expenses").catch((e) => { setError(e instanceof ApiError ? e.message : "Failed to load."); return { expenses: [] as Expense[] }; }),
      apiFetch<{ settings: Settings }>("/api/settings").catch(() => null),
    ]).then(([exp, set]) => {
      setExpenses(exp.expenses);
      setSettings(set?.settings ?? null);
      setLoading(false);
    });
  }, []);

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
  const dayThreshold = (settings?.weeklyLimit ?? 0) / 7 || 1;

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

  function cellColor(total: number) {
    if (total <= 0) return "bg-zinc-800";
    if (total < dayThreshold) return "bg-green-200";
    if (total < dayThreshold * 2) return "bg-green-500";
    if (total < dayThreshold * 3) return "bg-orange-500";
    return "bg-red-500";
  }

  if (loading) return <Center>Loading monthly report...</Center>;

  const budget = settings ? (settings.needsPct + settings.wantsPct + settings.savingsPct > 0 ? settings.monthlyIncome : 0) : 0;

  return (
    <main className="px-6 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-white">Monthly Report</h1>
          <input className="input w-auto" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-zinc-300">Total spend ({month})</p>
          <p className="mt-1 text-3xl font-semibold text-white">{inr(monthTotal)}</p>
          {budget > 0 && (
            <p className="mt-1 text-sm text-zinc-400">Monthly income budget: {inr(budget)}</p>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-3 text-lg font-semibold text-white">Category Totals</h2>
          {categoryTotals.length === 0 ? (
            <p className="text-sm text-zinc-400">No spending this month.</p>
          ) : (
            <ul className="space-y-2">
              {categoryTotals.map(([cat, amt]) => {
                const pct = monthTotal > 0 ? (amt / monthTotal) * 100 : 0;
                return (
                  <li key={cat}>
                    <div className="flex justify-between text-sm"><span className="text-zinc-300">{cat}</span><span className="text-white">{inr(amt)}</span></div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-3 text-lg font-semibold text-white">Need / Want / Saving</h2>
          <SplitBar label="Need" amount={typeSplit.Need} total={monthTotal} color="bg-cyan-400" />
          <SplitBar label="Want" amount={typeSplit.Want} total={monthTotal} color="bg-fuchsia-400" />
          <SplitBar label="Saving" amount={typeSplit.Saving} total={monthTotal} color="bg-emerald-400" />
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-3 text-lg font-semibold text-white">Daily Spend</h2>
          {dayTotals.size === 0 ? (
            <p className="text-sm text-zinc-400">No daily spending.</p>
          ) : (
            <ul className="space-y-1">
              {Array.from(dayTotals.entries())
                .sort((a, b) => (a[0] < b[0] ? 1 : -1))
                .map(([date, amt]) => (
                  <li key={date} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-1.5 text-sm">
                    <span className="text-zinc-300">{new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                    <span className="text-white">{inr(amt)}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-3 text-lg font-semibold text-white">Yearly Heatmap ({year})</h2>
          <div className="grid grid-flow-col grid-rows-7 gap-1">
            {yearCells.map((c) => (
              <div
                key={c.date}
                className={`h-3.5 w-3.5 rounded-sm ${cellColor(c.total)}`}
                title={c.date + (c.total > 0 ? ` · ${inr(c.total)}${c.top ? ` · ${c.top}` : ""}` : " · no spend")}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
            <span>Less</span>
            <span className="h-3 w-3 rounded-sm bg-zinc-800" />
            <span className="h-3 w-3 rounded-sm bg-green-200" />
            <span className="h-3 w-3 rounded-sm bg-green-500" />
            <span className="h-3 w-3 rounded-sm bg-orange-500" />
            <span className="h-3 w-3 rounded-sm bg-red-500" />
            <span>More</span>
          </div>
        </div>
      </div>
      <GlobalStyle />
    </main>
  );
}

function SplitBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="text-zinc-100">{inr(amount)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}
function Center({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center px-6 text-sm text-zinc-300">{children}</main>;
}
function GlobalStyle() {
  return (
    <style jsx global>{`
      .input {
        border-radius: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        padding: 0.4rem 0.7rem;
        color: #fff;
        font-size: 0.85rem;
        color-scheme: dark;
      }
      .input:focus { outline: none; border-color: rgba(56, 189, 248, 0.6); }
    `}</style>
  );
}
