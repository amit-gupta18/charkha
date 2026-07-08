"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { INCOME_SOURCES } from "@/lib/constants";
import type { Income } from "@/lib/types";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

export default function IncomePage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ date: string; amount: string; source: string; notes: string }>({ date: today(), amount: "", source: INCOME_SOURCES[0], notes: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch<{ incomes: Income[] }>("/api/income")
      .then((d) => setIncomes(d.incomes.sort((a, b) => (a.date < b.date ? 1 : -1))))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load income."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function submit() {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/income", {
        method: "POST",
        body: JSON.stringify({ date: form.date || today(), amount, source: form.source, notes: form.notes || undefined }),
      });
      setForm({ date: today(), amount: "", source: INCOME_SOURCES[0], notes: "" });
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to add income.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this income entry?")) return;
    try {
      await apiFetch(`/api/income/${id}`, { method: "DELETE" });
      setIncomes((p) => p.filter((i) => i.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    }
  }

  if (loading) return <Center>Loading income...</Center>;

  return (
    <main className="px-6 py-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold text-white">Income</h1>
        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Add Income</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1"><span className="text-sm text-zinc-300">Date</span>
              <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            <label className="block space-y-1"><span className="text-sm text-zinc-300">Amount (₹)</span>
              <input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
            </label>
            <label className="block space-y-1"><span className="text-sm text-zinc-300">Source</span>
              <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                {INCOME_SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="block space-y-1"><span className="text-sm text-zinc-300">Notes</span>
              <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>
          <button className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60"
            onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Add Income"}
          </button>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5">
          {incomes.length === 0 ? (
            <p className="p-6 text-sm text-zinc-400">No income recorded yet.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {incomes.map((i) => (
                <li key={i.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="font-medium text-white">{i.source}</p>
                    <p className="text-xs text-zinc-400">{new Date(i.date).toLocaleDateString("en-IN")}{i.notes ? ` · ${i.notes}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-white">{inr(i.amount)}</span>
                    <button className="text-red-300 hover:text-red-200" onClick={() => remove(i.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <GlobalStyle />
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center px-6 text-sm text-zinc-300">{children}</main>;
}
function GlobalStyle() {
  return (
    <style jsx global>{`
      .input {
        width: 100%;
        border-radius: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        padding: 0.5rem 0.7rem;
        color: #fff;
        font-size: 0.85rem;
      }
      .input:focus { outline: none; border-color: rgba(56, 189, 248, 0.6); }
    `}</style>
  );
}
