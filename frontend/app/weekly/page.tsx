"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Expense, Settings } from "@/lib/types";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function isoWeekKey(dateStr: string) {
  const d = new Date(dateStr);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export default function WeeklyPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const weeks = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const k = isoWeekKey(e.date);
      map.set(k, (map.get(k) ?? 0) + e.amount);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 8);
  }, [expenses]);

  const limit = settings?.weeklyLimit ?? 0;
  const currentWeekSpend = useMemo(() => {
    if (expenses.length === 0) return 0;
    const k = isoWeekKey(new Date().toISOString().slice(0, 10));
    return weeks.find((w) => w[0] === k)?.[1] ?? 0;
  }, [weeks, expenses]);

  if (loading) return <Center>Loading weekly summary...</Center>;

  const ratio = limit > 0 ? currentWeekSpend / limit : 0;

  return (
    <main className="px-6 py-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold text-white">Weekly Summary</h1>
        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-zinc-300">This week's spend</p>
          <p className="mt-1 text-3xl font-semibold text-white">{inr(currentWeekSpend)}</p>
          <p className="mt-1 text-sm text-zinc-400">of {inr(limit)} limit ({Math.round(ratio * 100)}%)</p>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className={`h-full rounded-full ${ratio > 1 ? "bg-red-500" : "bg-cyan-400"}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-3 text-lg font-semibold text-white">Last 8 weeks</h2>
          {weeks.length === 0 ? (
            <p className="text-sm text-zinc-400">No spending recorded.</p>
          ) : (
            <ul className="space-y-2">
              {weeks.map(([k, amt]) => {
                const over = limit > 0 && amt > limit;
                return (
                  <li key={k} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-2">
                    <span className="text-sm text-zinc-300">{k}</span>
                    <span className={`text-sm font-medium ${over ? "text-red-300" : "text-white"}`}>
                      {inr(amt)} {over ? "⚠" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center px-6 text-sm text-zinc-300">{children}</main>;
}
