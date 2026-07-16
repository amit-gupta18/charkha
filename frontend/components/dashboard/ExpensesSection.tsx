"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { CATEGORIES, PAYMENT_MODES } from "@/lib/constants";
import { inr, expenseShare } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { Alert, FieldLabel, PageCard, SectionTitle } from "@/components/ui/PageShell";
import { CreamSelect } from "@/components/ui/CreamSelect";
import { CreamDatePicker } from "@/components/ui/CreamDatePicker";

type Props = { refreshKey?: number; onChanged?: () => void; embedded?: boolean };

export function ExpensesSection({ refreshKey = 0, onChanged, embedded = true }: Props) {
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

  useEffect(load, [refreshKey]);

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
      onChanged?.();
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
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Update failed.");
    }
  }

  const typeColor = (t: string) =>
    t === "Need" ? "var(--blue)" : t === "Want" ? "var(--orange)" : "var(--green)";

  return (
    <PageCard id={embedded ? "expenses" : undefined} style={embedded ? undefined : { marginBottom: 0 }}>
      {embedded && <SectionTitle>All expenses</SectionTitle>}
      {error && <Alert type="error">{error}</Alert>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div><FieldLabel>Search</FieldLabel><input className="cream-input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div><FieldLabel>Category</FieldLabel>
          <CreamSelect value={category} onChange={setCategory} placeholder="All categories" options={CATEGORIES} />
        </div>
        <div><FieldLabel>Payment</FieldLabel>
          <CreamSelect value={paymentMode} onChange={setPaymentMode} placeholder="All modes" options={PAYMENT_MODES} />
        </div>
        <div><FieldLabel>Type</FieldLabel>
          <CreamSelect value={type} onChange={setType} placeholder="All types" options={["Need", "Want", "Saving"]} />
        </div>
        <div><FieldLabel>From</FieldLabel><CreamDatePicker value={from} onChange={setFrom} placeholder="Any date" allowClear /></div>
        <div><FieldLabel>To</FieldLabel><CreamDatePicker value={to} onChange={setTo} placeholder="Any date" allowClear /></div>
      </div>

      {loading ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>Loading expenses...</p>
      ) : filtered.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>No expenses match your filters.</p>
      ) : (
        <>
          <div className="data-table-desktop" style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th><th>Description</th><th>Category</th><th>Type</th><th>Mode</th>
                  <th style={{ textAlign: "right" }}>Amount</th><th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.date).toLocaleDateString("en-IN")}</td>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{e.description}</td>
                    <td>{e.category}</td>
                    <td><span style={{ color: typeColor(e.type), fontWeight: 700, fontSize: "0.75rem" }}>{e.type}</span></td>
                    <td>{e.paymentMode}</td>
                    <td className="amount">
                      {inr(expenseShare(e), 2)}
                      {e.isSplit && e.amount !== expenseShare(e) && (
                        <span style={{ display: "block", fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500 }}>Split · paid {inr(e.amount, 2)}</span>
                      )}
                    </td>
                    <td className="actions">
                      <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: "0.78rem" }} onClick={() => edit(e)}>Edit</button>
                      <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: "0.78rem", color: "var(--red)", marginLeft: 4 }} onClick={() => remove(e.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="data-table-mobile">
            {filtered.map((e) => (
              <div key={e.id} className="data-card">
                <div className="data-card-row">
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>{e.description}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {new Date(e.date).toLocaleDateString("en-IN")} · {e.category}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontWeight: 700, fontSize: "0.95rem" }}>{inr(expenseShare(e), 2)}</p>
                    <span style={{ color: typeColor(e.type), fontWeight: 700, fontSize: "0.72rem" }}>{e.type}</span>
                  </div>
                </div>
                <div className="data-card-row">
                  <span className="data-card-label">Payment</span>
                  <span className="data-card-value">{e.paymentMode}</span>
                </div>
                {e.isSplit && e.amount !== expenseShare(e) && (
                  <div className="data-card-row">
                    <span className="data-card-label">Paid total</span>
                    <span className="data-card-value">{inr(e.amount, 2)}</span>
                  </div>
                )}
                <div className="data-card-actions">
                  <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: "0.78rem", flex: 1 }} onClick={() => edit(e)}>Edit</button>
                  <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: "0.78rem", color: "var(--red)", flex: 1 }} onClick={() => remove(e.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </PageCard>
  );
}
