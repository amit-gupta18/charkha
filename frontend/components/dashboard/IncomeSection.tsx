"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { INCOME_SOURCES } from "@/lib/constants";
import { inr, today } from "@/lib/format";
import {
  useCreateIncomeMutation,
  useDeleteIncomeMutation,
  useIncomeQuery,
} from "@/lib/query/hooks";
import { useAuthQueryEnabled } from "@/hooks/useDashboardData";
import { Alert, FieldLabel, PageCard, SectionTitle } from "@/components/ui/PageShell";
import { CreamSelect } from "@/components/ui/CreamSelect";
import { CreamDatePicker } from "@/components/ui/CreamDatePicker";

type Props = { embedded?: boolean };

export function IncomeSection({ embedded = true }: Props) {
  const enabled = useAuthQueryEnabled();
  const { data: incomes = [], isLoading } = useIncomeQuery(enabled);
  const createMutation = useCreateIncomeMutation();
  const deleteMutation = useDeleteIncomeMutation();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ date: string; amount: string; source: string; notes: string }>({
    date: today(),
    amount: "",
    source: INCOME_SOURCES[0],
    notes: "",
  });

  const sorted = [...incomes].sort((a, b) => (a.date < b.date ? 1 : -1));

  async function submit() {
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setError(null);
    try {
      await createMutation.mutateAsync({
        date: form.date || today(),
        amount,
        source: form.source,
        notes: form.notes || undefined,
      });
      setForm({ date: today(), amount: "", source: INCOME_SOURCES[0], notes: "" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to add income.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this income entry?")) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    }
  }

  return (
    <PageCard id={embedded ? "income" : undefined} style={embedded ? undefined : { marginBottom: 0 }}>
      {embedded && <SectionTitle>Income</SectionTitle>}
      {error && <Alert type="error">{error}</Alert>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
        <div><FieldLabel>Date</FieldLabel>
          <CreamDatePicker value={form.date} onChange={(date) => setForm({ ...form, date })} />
        </div>
        <div><FieldLabel>Amount (₹)</FieldLabel>
          <input className="cream-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
        </div>
        <div><FieldLabel>Source</FieldLabel>
          <CreamSelect value={form.source} onChange={(source) => setForm({ ...form, source })} options={INCOME_SOURCES} />
        </div>
        <div><FieldLabel>Notes</FieldLabel>
          <input className="cream-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
        </div>
      </div>
      <button className="btn-accent" onClick={submit} disabled={createMutation.isPending} style={{ width: "100%", marginBottom: 16 }}>
        {createMutation.isPending ? "Saving..." : "Add income"}
      </button>

      {isLoading ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>Loading income...</p>
      ) : sorted.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>No income recorded yet. Log allowance or freelance payments above.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {sorted.map((i, idx) => (
            <div key={i.id} className="list-row" style={{
              padding: "11px 0",
              borderBottom: idx < sorted.length - 1 ? "1px solid var(--border-light)" : "none",
            }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>{i.source}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {new Date(i.date).toLocaleDateString("en-IN")}{i.notes ? ` · ${i.notes}` : ""}
                </p>
              </div>
              <div className="list-row-actions">
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--green)" }}>{inr(i.amount)}</span>
                <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: "0.78rem", color: "var(--red)" }} onClick={() => remove(i.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageCard>
  );
}
