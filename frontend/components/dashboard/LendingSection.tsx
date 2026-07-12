"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { inr, today } from "@/lib/format";
import type { Lending } from "@/lib/types";
import { Alert, FieldLabel, PageCard, SectionTitle } from "@/components/ui/PageShell";
import { CreamDatePicker } from "@/components/ui/CreamDatePicker";

type Props = { refreshKey?: number; onChanged?: () => void; embedded?: boolean };

export function LendingSection({ refreshKey = 0, onChanged, embedded = true }: Props) {
  const [lendings, setLendings] = useState<Lending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ date: today(), personName: "", amount: "", reason: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch<{ lendings: Lending[] }>("/api/lending")
      .then((d) => setLendings(d.lendings))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load lending."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [refreshKey]);

  async function submit() {
    const amount = Number(form.amount);
    if (!form.personName.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter person name and valid amount.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/lending", {
        method: "POST",
        body: JSON.stringify({
          date: form.date || today(),
          personName: form.personName.trim(),
          amount,
          reason: form.reason.trim(),
        }),
      });
      setForm({ date: today(), personName: "", amount: "", reason: "" });
      load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to add lending.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(entry: Lending) {
    const next = entry.status === "pending" ? "settled" : "pending";
    try {
      await apiFetch(`/api/lending/${entry.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: next }),
      });
      load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this lending entry?")) return;
    try {
      await apiFetch(`/api/lending/${id}`, { method: "DELETE" });
      load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    }
  }

  const totalPending = lendings.filter((l) => l.status === "pending").reduce((s, l) => s + l.amount, 0);

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
      <button className="btn-accent" onClick={submit} disabled={saving} style={{ width: "100%", marginBottom: 16 }}>
        {saving ? "Saving..." : "Log lending"}
      </button>

      {loading ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>Loading...</p>
      ) : lendings.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>No lending logged yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {lendings.map((l, idx) => (
            <div key={l.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 0",
              borderBottom: idx < lendings.length - 1 ? "1px solid var(--border-light)" : "none",
            }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>{l.personName}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {new Date(l.date).toLocaleDateString("en-IN")}{l.reason ? ` · ${l.reason}` : ""}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
