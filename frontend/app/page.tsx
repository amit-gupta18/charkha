"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { DashboardData } from "@/lib/types";

const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function Home() {
  const { isLoading: authLoading, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let active = true;
    setLoading(true);
    apiFetch<DashboardData>("/api/dashboard")
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e instanceof ApiError ? e.message : "Failed to load dashboard."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [authLoading]);

  if (authLoading || (loading && !data)) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 px-6 py-5 text-sm text-zinc-300">
          Loading your dashboard...
        </div>
      </main>
    );
  }

  if (!user) return null;

  if (error) {
    return (
      <main className="px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-500/30 bg-red-500/10 px-6 py-5 text-sm text-red-200">
          {error}
        </div>
      </main>
    );
  }

  const d = data!;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_32%),linear-gradient(180deg,_#09090b_0%,_#111827_100%)] px-6 py-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Voice Expense Tracker</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Welcome back, {user.name}</h1>
            <p className="text-sm text-zinc-300">Here's your spending at a glance.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
            <span className="text-sm text-cyan-100/80">Coins</span>
            <span className="text-xl font-semibold text-white">{d.coinBalance}</span>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Today's Spend" value={inr(d.todaySpend)} accent="cyan" />
          <Stat label="This Week's Spend" value={inr(d.weeklySpend)} accent="cyan" />
          <Stat label="This Month's Spend" value={inr(d.monthlySpend)} accent="cyan" />
          <Stat label="Monthly Income" value={inr(d.monthlyIncome)} accent="green" />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Weekly Budget</h2>
            <span className={`text-sm font-medium ${d.weeklyRatio * 100 > 100 ? "text-red-300" : "text-cyan-200"}`}>
              {Math.round(d.weeklyRatio * 100)}%
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full ${d.weeklyRatio * 100 > 100 ? "bg-red-500" : "bg-cyan-400"}`}
              style={{ width: `${Math.min(100, d.weeklyRatio * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-zinc-300">
            {inr(d.weeklySpend)} of {inr(d.weeklyLimit)}
          </p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Need / Want / Saving Split</h2>
          <SplitBar label="Need" amount={d.typeSplit.Need} total={d.monthlySpend} color="bg-cyan-400" />
          <SplitBar label="Want" amount={d.typeSplit.Want} total={d.monthlySpend} color="bg-fuchsia-400" />
          <SplitBar label="Saving" amount={d.typeSplit.Saving} total={d.monthlySpend} color="bg-emerald-400" />
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Recent Expenses</h2>
          {d.recentExpenses.length === 0 ? (
            <p className="text-sm text-zinc-400">No expenses yet. Try logging one with your voice.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {d.recentExpenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-white">{e.description}</p>
                    <p className="text-xs text-zinc-400">{e.category} · {e.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{inr(e.amount)}</p>
                    <p className="text-xs text-zinc-400">{new Date(e.date).toLocaleDateString("en-IN")}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: "cyan" | "green" }) {
  return (
    <article className={`rounded-3xl border p-5 ${accent === "cyan" ? "border-cyan-400/20 bg-cyan-400/10" : "border-emerald-400/20 bg-emerald-400/10"}`}>
      <p className="text-sm text-zinc-300">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </article>
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
