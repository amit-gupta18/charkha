"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { inr, today } from "@/lib/format";
import {
  useCreateLendingMutation,
  useDeleteLendingMutation,
  useLendingQuery,
  useUpdateLendingMutation,
} from "@/lib/query/hooks";
import { useAuthQueryEnabled } from "@/hooks/useDashboardData";
import type { Lending } from "@/lib/types";
import { Alert, FieldLabel, PageCard, SectionTitle } from "@/components/ui/PageShell";
import { CreamDatePicker } from "@/components/ui/CreamDatePicker";

type Props = { embedded?: boolean };

export function LendingSection({ embedded = true }: Props) {
  const enabled = useAuthQueryEnabled();
  const { data: lendings = [], isLoading } = useLendingQuery(enabled);
  const createMutation = useCreateLendingMutation();
  const updateMutation = useUpdateLendingMutation();
  const deleteMutation = useDeleteLendingMutation();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ date: today(), personName: "", amount: "", reason: "" });

  const totalPending = lendings.filter((l) => l.status === "pending").reduce((s, l) => s + l.amount, 0);

  async function submit() {
    const amount = Number(form.amount);
    if (!form.personName.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter person name and valid amount.");
      return;
    }
    setError(null);
    try {
      await createMutation.mutateAsync({
        date: form.date || today(),
        personName: form.personName.trim(),
        amount,
        reason: form.reason.trim(),
      });
      setForm({ date: today(), personName: "", amount: "", reason: "" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to add lending.");
    }
  }

  async function toggleStatus(entry: Lending) {
    const next = entry.status === "pending" ? "settled" : "pending";
    setError(null);
    try {
      await updateMutation.mutateAsync({ id: entry.id, body: { status: next } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this lending entry?")) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    }
  }

  return (
    <PageCard id={embedded ? "lending" : undefined} style={embedded ? undefined : { marginBottom: 0 }}>
      {embedded && <SectionTitle>Lending</SectionTitle>}
      {error && <Alert type="error">{error}</Alert>}

      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 14 }}>
        Total pending to receive: <strong style={{ color: "var(--text-primary)" }}>{inr(totalPending)}</strong>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
        <div><FieldLabel>Date</FieldLabel><CreamDatePicker value={form.date} onChange={(date) => setForm({ ...form, date })} /></div>
        <div><FieldLabel>Person</FieldLabel><input className="cream-input" value={form.personName} onChange={(e) => setForm({ ...form, personName: e.target.value })} placeholder="Name" /></div>
        <div><FieldLabel>Amount (₹)</FieldLabel><input className="cream-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
        <div><FieldLabel>Reason</FieldLabel><input className="cream-input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="dinner, trip..." /></div>
      </div>
      <button className="btn-accent" onClick={submit} disabled={createMutation.isPending} style={{ width: "100%", marginBottom: 16 }}>
        {createMutation.isPending ? "Saving..." : "Log lending"}
      </button>

      {isLoading ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>Loading...</p>
      ) : lendings.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>No lending logged yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {lendings.map((l, idx) => (
            <div key={l.id} className="list-row" style={{
              padding: "11px 0",
              borderBottom: idx < lendings.length - 1 ? "1px solid var(--border-light)" : "none",
            }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>{l.personName}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {new Date(l.date).toLocaleDateString("en-IN")}{l.reason ? ` · ${l.reason}` : ""}
                </p>
              </div>
              <div className="list-row-actions">
                <span className={`badge ${l.status === "settled" ? "badge-green" : "badge-orange"}`}>{l.status}</span>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{inr(l.amount)}</span>
                <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: "0.78rem" }} onClick={() => toggleStatus(l)}>
                  {l.status === "pending" ? "Settled" : "Pending"}
                </button>
                <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: "0.78rem", color: "var(--red)" }} onClick={() => remove(l.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageCard>
  );
}
