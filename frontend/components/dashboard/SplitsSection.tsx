"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { CATEGORIES, PAYMENT_MODES } from "@/lib/constants";
import { inr, today } from "@/lib/format";
import type { Flatmate, SplitExpense, SplitSettlement } from "@/lib/types";
import { Alert, FieldLabel, PageCard, SectionTitle } from "@/components/ui/PageShell";
import { CreamSelect } from "@/components/ui/CreamSelect";
import { CreamDatePicker } from "@/components/ui/CreamDatePicker";

type Props = { refreshKey?: number; onChanged?: () => void; embedded?: boolean };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function SplitsSection({ refreshKey = 0, onChanged, embedded = true }: Props) {
  const [flatmates, setFlatmates] = useState<Flatmate[]>([]);
  const [splits, setSplits] = useState<SplitExpense[]>([]);
  const [settlements, setSettlements] = useState<SplitSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [fmForm, setFmForm] = useState({ name: "", phone: "" });

  const [expForm, setExpForm] = useState<{ date: string; description: string; category: string; amount: string; paymentMode: string; isSplit: boolean; selectedFlatmates: string[]; shares: Record<string, string> }>({
    date: today(), description: "", category: CATEGORIES[0], amount: "", paymentMode: PAYMENT_MODES[0], isSplit: false, selectedFlatmates: [], shares: {},
  });

  const [clearForm, setClearForm] = useState({
    flatmateId: "",
    amount: "",
    reason: "",
    date: today(),
  });

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch<{ flatmates: Flatmate[] }>("/api/flatmates"),
      apiFetch<{ splits: SplitExpense[] }>("/api/splits"),
      apiFetch<{ settlements: SplitSettlement[] }>("/api/splits/settlements"),
    ])
      .then(([fm, sp, st]) => {
        setFlatmates(fm.flatmates);
        setSplits(sp.splits);
        setSettlements(st.settlements);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load splits."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [refreshKey, load]);

  useEffect(() => {
    if (!clearForm.flatmateId && flatmates[0]) {
      setClearForm((f) => ({ ...f, flatmateId: flatmates[0].id }));
    }
  }, [flatmates, clearForm.flatmateId]);

  const pendingByFlatmate = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of splits) {
      for (const m of s.members) {
        if (m.status === "pending" && m.amountPending > 0) {
          map.set(m.flatmateId, (map.get(m.flatmateId) ?? 0) + m.amountPending);
        }
      }
    }
    return map;
  }, [splits]);

  const totalAmount = Number(expForm.amount) || 0;
  const flatmateShareSum = expForm.selectedFlatmates.reduce(
    (s, id) => s + (Number(expForm.shares[id]) || 0),
    0,
  );
  const userSharePreview = expForm.isSplit ? round2(totalAmount - flatmateShareSum) : totalAmount;

  function toggleFlatmate(id: string) {
    setExpForm((f) => {
      const selected = f.selectedFlatmates.includes(id)
        ? f.selectedFlatmates.filter((x) => x !== id)
        : [...f.selectedFlatmates, id];
      const shares = { ...f.shares };
      if (!f.selectedFlatmates.includes(id) && selected.includes(id)) {
        const count = selected.length;
        const per = count > 0 ? round2(totalAmount / (count + 1)) : 0;
        shares[id] = String(per);
      }
      if (!selected.includes(id)) delete shares[id];
      return { ...f, selectedFlatmates: selected, shares };
    });
  }

  function applyEqualShares() {
    const count = expForm.selectedFlatmates.length;
    if (count === 0 || totalAmount <= 0) return;
    const per = round2(totalAmount / (count + 1));
    const shares: Record<string, string> = {};
    expForm.selectedFlatmates.forEach((id, i) => {
      shares[id] = String(i === count - 1 ? round2(totalAmount - per - per * (count - 1)) : per);
    });
    setExpForm((f) => ({ ...f, shares }));
  }

  async function addFlatmate() {
    if (!fmForm.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/flatmates", {
        method: "POST",
        body: JSON.stringify({ name: fmForm.name.trim(), phone: fmForm.phone.trim() }),
      });
      setFmForm({ name: "", phone: "" });
      load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to add flatmate.");
    } finally {
      setSaving(false);
    }
  }

  async function removeFlatmate(id: string) {
    if (!confirm("Remove this flatmate?")) return;
    try {
      await apiFetch(`/api/flatmates/${id}`, { method: "DELETE" });
      load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    }
  }

  async function submitExpense() {
    const amount = Number(expForm.amount);
    if (!expForm.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter description and valid amount.");
      return;
    }
    if (expForm.isSplit && expForm.selectedFlatmates.length === 0) {
      setError("Select at least one flatmate for split.");
      return;
    }
    if (expForm.isSplit && Math.abs(flatmateShareSum + userSharePreview - amount) > 0.02) {
      setError("Shares must sum to total amount.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        date: expForm.date || today(),
        description: expForm.description.trim(),
        category: expForm.category,
        amount,
        paymentMode: expForm.paymentMode,
      };
      if (expForm.isSplit) {
        body.split = {
          flatmateIds: expForm.selectedFlatmates,
          shares: expForm.selectedFlatmates.map((id) => Number(expForm.shares[id]) || 0),
        };
      }
      await apiFetch("/api/expenses", { method: "POST", body: JSON.stringify(body) });
      setExpForm({
        date: today(),
        description: "",
        category: CATEGORIES[0],
        amount: "",
        paymentMode: PAYMENT_MODES[0],
        isSplit: false,
        selectedFlatmates: [],
        shares: {},
      });
      load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to log expense.");
    } finally {
      setSaving(false);
    }
  }

  async function submitClear() {
    const amount = Number(clearForm.amount);
    if (!clearForm.flatmateId || !Number.isFinite(amount) || amount <= 0) {
      setError("Select flatmate and enter valid amount.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/splits/settlements", {
        method: "POST",
        body: JSON.stringify({
          flatmateId: clearForm.flatmateId,
          amount,
          reason: clearForm.reason,
          date: clearForm.date || today(),
        }),
      });
      setClearForm((f) => ({ ...f, amount: "", reason: "" }));
      load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  }

  async function settleMember(memberId: string) {
    try {
      await apiFetch(`/api/splits/members/${memberId}/settle`, { method: "PATCH" });
      load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Settle failed.");
    }
  }

  async function deleteSettlement(id: string) {
    if (!confirm("Reverse this split clear?")) return;
    try {
      await apiFetch(`/api/splits/settlements/${id}`, { method: "DELETE" });
      load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    }
  }

  const clearPending = clearForm.flatmateId ? (pendingByFlatmate.get(clearForm.flatmateId) ?? 0) : 0;

  return (
    <PageCard id={embedded ? "splits" : undefined} style={embedded ? undefined : { marginBottom: 0 }}>
      {embedded && <SectionTitle>Splits</SectionTitle>}
      {error && <Alert type="error">{error}</Alert>}

      {/* Flatmates */}
      <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>Flatmates</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 10 }}>
        <div><FieldLabel>Name</FieldLabel>
          <input className="cream-input" value={fmForm.name} onChange={(e) => setFmForm({ ...fmForm, name: e.target.value })} placeholder="Rahul" />
        </div>
        <div><FieldLabel>Phone</FieldLabel>
          <input className="cream-input" value={fmForm.phone} onChange={(e) => setFmForm({ ...fmForm, phone: e.target.value })} placeholder="Optional" />
        </div>
        <div style={{ alignSelf: "end" }}>
          <button className="btn-accent" onClick={addFlatmate} disabled={saving} style={{ padding: "10px 16px" }}>Add</button>
        </div>
      </div>
      {flatmates.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
          {flatmates.map((f) => (
            <span key={f.id} className="badge badge-blue" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {f.name}{f.phone ? ` · ${f.phone}` : ""}
              <button type="button" onClick={() => removeFlatmate(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: "0.75rem" }}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* Log split expense */}
      <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>Log expense (with optional split)</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 10 }}>
        <div><FieldLabel>Date</FieldLabel><CreamDatePicker value={expForm.date} onChange={(date) => setExpForm({ ...expForm, date })} /></div>
        <div><FieldLabel>Description</FieldLabel><input className="cream-input" value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} /></div>
        <div><FieldLabel>Total paid (₹)</FieldLabel><input className="cream-input" type="number" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} /></div>
        <div><FieldLabel>Category</FieldLabel><CreamSelect value={expForm.category} onChange={(category) => setExpForm({ ...expForm, category })} options={CATEGORIES} /></div>
        <div><FieldLabel>Payment</FieldLabel><CreamSelect value={expForm.paymentMode} onChange={(paymentMode) => setExpForm({ ...expForm, paymentMode })} options={PAYMENT_MODES} /></div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: "0.85rem", cursor: "pointer" }}>
        <input type="checkbox" checked={expForm.isSplit} onChange={(e) => setExpForm({ ...expForm, isSplit: e.target.checked })} />
        Split with flatmates
      </label>
      {expForm.isSplit && (
        <div style={{ marginBottom: 12, padding: 12, background: "var(--parchment)", borderRadius: 10 }}>
          {flatmates.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Add flatmates first.</p>
          ) : (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {flatmates.map((f) => (
                  <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={expForm.selectedFlatmates.includes(f.id)} onChange={() => toggleFlatmate(f.id)} />
                    {f.name}
                  </label>
                ))}
              </div>
              {expForm.selectedFlatmates.length > 0 && (
                <>
                  <button type="button" className="btn-ghost" style={{ marginBottom: 10, fontSize: "0.78rem" }} onClick={applyEqualShares}>Equal split (incl. you)</button>
                  {expForm.selectedFlatmates.map((id) => {
                    const f = flatmates.find((x) => x.id === id);
                    return (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <span style={{ minWidth: 80, fontSize: "0.85rem" }}>{f?.name}</span>
                        <input className="cream-input" type="number" style={{ maxWidth: 120 }} value={expForm.shares[id] ?? ""} onChange={(e) => setExpForm({ ...expForm, shares: { ...expForm.shares, [id]: e.target.value } })} />
                      </div>
                    );
                  })}
                  <p style={{ fontSize: "0.85rem", marginTop: 8, color: "var(--text-secondary)" }}>
                    Your share: <strong>{inr(userSharePreview)}</strong> · Balance debits: <strong>{inr(totalAmount)}</strong>
                  </p>
                </>
              )}
            </>
          )}
        </div>
      )}
      <button className="btn-accent" onClick={submitExpense} disabled={saving} style={{ width: "100%", marginBottom: 24 }}>
        {saving ? "Saving..." : "Log expense"}
      </button>

      {/* Split clear */}
      <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>Split clear — payment received</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 10 }}>
        <div><FieldLabel>Flatmate</FieldLabel>
          <CreamSelect value={clearForm.flatmateId} onChange={(flatmateId) => setClearForm({ ...clearForm, flatmateId })} placeholder="Select" options={flatmates.map((f) => ({ value: f.id, label: f.name }))} />
        </div>
        <div><FieldLabel>Amount (₹)</FieldLabel><input className="cream-input" type="number" value={clearForm.amount} onChange={(e) => setClearForm({ ...clearForm, amount: e.target.value })} /></div>
        <div><FieldLabel>Reason</FieldLabel><input className="cream-input" value={clearForm.reason} onChange={(e) => setClearForm({ ...clearForm, reason: e.target.value })} placeholder="grocery, UPI..." /></div>
        <div><FieldLabel>Date</FieldLabel><CreamDatePicker value={clearForm.date} onChange={(date) => setClearForm({ ...clearForm, date })} /></div>
      </div>
      {clearForm.flatmateId && (
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 8 }}>
          Pending from this flatmate: {inr(clearPending)}
          {Number(clearForm.amount) > 0 && ` → after clear: ${inr(Math.max(0, clearPending - Number(clearForm.amount)))}`}
        </p>
      )}
      <button className="btn-accent" onClick={submitClear} disabled={saving || flatmates.length === 0} style={{ width: "100%", marginBottom: 24 }}>
        {saving ? "Saving..." : "Log split clear"}
      </button>

      {loading ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>Loading...</p>
      ) : (
        <>
          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>Split tracker</p>
          {splits.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20 }}>No split expenses yet.</p>
          ) : (
            <div style={{ marginBottom: 24 }}>
              {splits.map(({ expense, members }) => (
                <div key={expense.id} style={{ borderBottom: "1px solid var(--border-light)", padding: "12px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{expense.description}</p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {new Date(expense.date).toLocaleDateString("en-IN")} · Paid {inr(expense.amount)} · Your share {inr(expense.userShare ?? expense.amount)}
                      </p>
                    </div>
                  </div>
                  {members.map((m) => (
                    <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0 4px 12px", fontSize: "0.85rem" }}>
                      <span>{m.flatmate?.name ?? "Unknown"} — owed {inr(m.amountOwed)}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className={`badge ${m.status === "settled" ? "badge-green" : "badge-orange"}`}>
                          {m.status === "settled" ? "Settled" : `${inr(m.amountPending)} pending`}
                        </span>
                        {m.status === "pending" && m.amountPending > 0 && (
                          <button className="btn-ghost" style={{ padding: "2px 8px", fontSize: "0.75rem" }} onClick={() => settleMember(m.id)}>Settle</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>Settlement history</p>
          {settlements.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No split clears logged yet.</p>
          ) : (
            settlements.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border-light)" }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.88rem" }}>{s.flatmateName} — {inr(s.amount)}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {new Date(s.date).toLocaleDateString("en-IN")}{s.reason ? ` · ${s.reason}` : ""}
                  </p>
                </div>
                <button className="btn-ghost" style={{ color: "var(--red)", fontSize: "0.78rem" }} onClick={() => deleteSettlement(s.id)}>Undo</button>
              </div>
            ))
          )}
        </>
      )}
    </PageCard>
  );
}
