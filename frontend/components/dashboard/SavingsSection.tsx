"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { SAVINGS_DESTINATIONS, SAVINGS_KINDS } from "@/lib/constants";
import type { SavingsDestination, SavingsKind } from "@/lib/constants";
import { inr, today } from "@/lib/format";
import {
  useCreateSavingsMutation,
  useDeleteSavingsMutation,
  useSavingsQuery,
  useUpdateSavingsMutation,
} from "@/lib/query/hooks";
import { useAuthQueryEnabled } from "@/hooks/useDashboardData";
import type { Saving } from "@/lib/types";
import { Alert, FieldLabel, PageCard, SectionTitle } from "@/components/ui/PageShell";
import { CreamDatePicker } from "@/components/ui/CreamDatePicker";
import { CreamSelect } from "@/components/ui/CreamSelect";

type Props = { embedded?: boolean };

export function SavingsSection({ embedded = true }: Props) {
  const enabled = useAuthQueryEnabled();
  const { data: entries = [], isLoading } = useSavingsQuery(enabled);
  const createMutation = useCreateSavingsMutation();
  const updateMutation = useUpdateSavingsMutation();
  const deleteMutation = useDeleteSavingsMutation();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    date: string;
    kind: SavingsKind;
    amount: string;
    destination: SavingsDestination;
    reason: string;
  }>({
    date: today(),
    kind: SAVINGS_KINDS[0],
    amount: "",
    destination: SAVINGS_DESTINATIONS[0],
    reason: "",
  });

  const totalActive = entries.filter((e) => e.status === "active").reduce((s, e) => s + e.amount, 0);
  const totalInvested = entries.filter((e) => e.status === "active" && e.kind === "invested").reduce((s, e) => s + e.amount, 0);
  const totalSaved = entries.filter((e) => e.status === "active" && e.kind === "saved").reduce((s, e) => s + e.amount, 0);

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
        kind: form.kind,
        amount,
        destination: form.destination,
        reason: form.reason.trim(),
      });
      setForm({ date: today(), kind: form.kind, amount: "", destination: form.destination, reason: "" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to log savings.");
    }
  }

  async function toggleWithdrawn(entry: Saving) {
    const next = entry.status === "active" ? "withdrawn" : "active";
    setError(null);
    try {
      await updateMutation.mutateAsync({ id: entry.id, body: { status: next } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this savings entry?")) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    }
  }

  return (
    <PageCard id={embedded ? "savings" : undefined} style={embedded ? undefined : { marginBottom: 0 }}>
      {embedded && <SectionTitle>Savings & investments</SectionTitle>}
      {error && <Alert type="error">{error}</Alert>}

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14, fontSize: "0.85rem" }}>
        <span>Active total: <strong>{inr(totalActive)}</strong></span>
        <span style={{ color: "var(--green)" }}>Invested: {inr(totalInvested)}</span>
        <span style={{ color: "var(--blue)" }}>Saved: {inr(totalSaved)}</span>
      </div>
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
        Log money moved out of your account into investments or savings. This reduces your liquid balance but stays tracked here until you withdraw it back.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
        <div><FieldLabel>Date</FieldLabel><CreamDatePicker value={form.date} onChange={(date) => setForm({ ...form, date })} /></div>
        <div>
          <FieldLabel>Type</FieldLabel>
          <CreamSelect
            value={form.kind}
            onChange={(kind) => setForm({ ...form, kind: kind as SavingsKind })}
            options={[
              { value: "invested", label: "Invested" },
              { value: "saved", label: "Saved for later" },
            ]}
          />
        </div>
        <div><FieldLabel>Amount (₹)</FieldLabel><input className="cream-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
        <div>
          <FieldLabel>Where</FieldLabel>
          <CreamSelect value={form.destination} onChange={(destination) => setForm({ ...form, destination: destination as SavingsDestination })} options={SAVINGS_DESTINATIONS} />
        </div>
        <div><FieldLabel>Note</FieldLabel><input className="cream-input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="HDFC SIP, emergency jar..." /></div>
      </div>
      <button className="btn-accent" onClick={submit} disabled={createMutation.isPending} style={{ width: "100%", marginBottom: 16 }}>
        {createMutation.isPending ? "Saving..." : "Log savings / investment"}
      </button>

      {isLoading ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>Loading...</p>
      ) : entries.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>No savings logged yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {entries.map((e, idx) => (
            <div key={e.id} className="list-row" style={{
              padding: "11px 0",
              borderBottom: idx < entries.length - 1 ? "1px solid var(--border-light)" : "none",
            }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                  {e.kind === "invested" ? "📈" : "🏦"} {e.destination || (e.kind === "invested" ? "Investment" : "Savings")}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {new Date(e.date).toLocaleDateString("en-IN")}
                  {e.reason ? ` · ${e.reason}` : ""}
                </p>
              </div>
              <div className="list-row-actions" style={{ flexShrink: 0 }}>
                <span className={`badge ${e.status === "active" ? "badge-green" : "badge-blue"}`}>{e.status}</span>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{inr(e.amount)}</span>
                <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: "0.78rem" }} onClick={() => toggleWithdrawn(e)}>
                  {e.status === "active" ? "Withdrawn" : "Active"}
                </button>
                <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: "0.78rem", color: "var(--red)" }} onClick={() => remove(e.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageCard>
  );
}
