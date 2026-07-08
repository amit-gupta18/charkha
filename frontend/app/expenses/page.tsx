"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { CATEGORIES, PAYMENT_MODES } from "@/lib/constants";
import type { Expense } from "@/lib/types";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    setError(null);
    apiFetch<{ expenses: Expense[] }>("/api/expenses")
      .then((data) => setExpenses(data.expenses))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load expenses."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => (category ? e.category === category : true))
      .filter((e) => (paymentMode ? e.paymentMode === paymentMode : true))
      .filter((e) => (type ? e.type === type : true))
      .filter((e) => (from ? e.date >= from : true))
      .filter((e) => (to ? e.date <= to : true))
      .filter((e) => (search ? e.description.toLowerCase().includes(search.toLowerCase()) : true))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [expenses, category, paymentMode, type, from, to, search]);

  async function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    try {
      await apiFetch(`/api/expenses/${id}`, { method: "DELETE" });
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    }
  }

  async function edit(e: Expense) {
    const description = prompt("Description", e.description);
    if (description === null) return;
    const amountStr = prompt("Amount", String(e.amount));
    if (amountStr === null) return;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount)) return;
    const cat = prompt(`Category (${CATEGORIES.join(", ")})`, e.category) || e.category;
    const pm = prompt(`Payment mode (${PAYMENT_MODES.join(", ")})`, e.paymentMode) || e.paymentMode;
    try {
      await apiFetch<Expense>(`/api/expenses/${e.id}`, {
        method: "PUT",
        body: JSON.stringify({ description, amount, category: cat, paymentMode: pm }),
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    }
  }

  if (loading) {
    return <Center>Loading expenses...</Center>;
  }

  return (
    <main className="px-6 py-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <h1 className="text-2xl font-semibold text-white">All Expenses</h1>

        {error && <Err msg={error} />}

        <div className="grid grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 md:grid-cols-3 lg:grid-cols-6">
          <input className="input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="input" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
            <option value="">All modes</option>
            {PAYMENT_MODES.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            <option>Need</option>
            <option>Want</option>
            <option>Saving</option>
          </select>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-400">No expenses match your filters.</p>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-400">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-zinc-300">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 text-white">{e.description}</td>
                    <td className="px-4 py-3 text-zinc-300">{e.category}</td>
                    <td className="px-4 py-3 text-zinc-300">{e.type}</td>
                    <td className="px-4 py-3 text-zinc-300">{e.paymentMode}</td>
                    <td className="px-4 py-3 text-right font-medium text-white">{inr(e.amount)}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-cyan-300 hover:text-cyan-200" onClick={() => edit(e)}>Edit</button>
                      <span className="px-1 text-zinc-600">·</span>
                      <button className="text-red-300 hover:text-red-200" onClick={() => remove(e.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <GlobalStyle />
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center px-6 text-sm text-zinc-300">{children}</main>;
}
function Err({ msg }: { msg: string }) {
  return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{msg}</div>;
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
