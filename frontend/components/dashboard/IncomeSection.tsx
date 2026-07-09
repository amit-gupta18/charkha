"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { INCOME_SOURCES } from "@/lib/constants";
import { inr, today } from "@/lib/format";
import type { Income } from "@/lib/types";
import { Alert, FieldLabel, PageCard, SectionTitle } from "@/components/ui/PageShell";
import { CreamSelect } from "@/components/ui/CreamSelect";
import { CreamDatePicker } from "@/components/ui/CreamDatePicker";

type Props = { refreshKey?: number; onChanged?: () => void; embedded?: boolean };

export function IncomeSection({ refreshKey = 0, onChanged, embedded = true }: Props) {
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

  useEffect(load, [refreshKey]);

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
      onChanged?.();
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
      onChanged?.();
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
      <button className="btn-accent" onClick={submit} disabled={saving} style={{ width: "100%", marginBottom: 16 }}>
        {saving ? "Saving..." : "Add income"}
      </button>

      {loading ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>Loading income...</p>
      ) : incomes.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>No income recorded yet. Log allowance or freelance payments above.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {incomes.map((i, idx) => (
            <div key={i.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 0",
              borderBottom: idx < incomes.length - 1 ? "1px solid var(--border-light)" : "none",
            }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>{i.source}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {new Date(i.date).toLocaleDateString("en-IN")}{i.notes ? ` · ${i.notes}` : ""}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
