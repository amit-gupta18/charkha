"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { CATEGORIES, PAYMENT_MODES } from "@/lib/constants";
import { inr, today } from "@/lib/format";
import type { Flatmate, PlateBalance, SplitRecord, SplitSettlement } from "@/lib/types";
import { Alert, FieldLabel, PageCard, SectionTitle } from "@/components/ui/PageShell";
import { CreamSelect } from "@/components/ui/CreamSelect";
import { CreamDatePicker } from "@/components/ui/CreamDatePicker";

type Props = { refreshKey?: number; onChanged?: () => void; embedded?: boolean };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function equalShares(total: number, flatmateIds: string[]): Record<string, string> {
  if (total <= 0 || flatmateIds.length === 0) return {};
  const per = round2(total / (flatmateIds.length + 1));
  const shares: Record<string, string> = {};
  flatmateIds.forEach((id, i) => {
    if (i === flatmateIds.length - 1) {
      const assigned = round2(per * (flatmateIds.length - 1));
      shares[id] = String(round2(total - per - assigned));
    } else {
      shares[id] = String(per);
    }
  });
  return shares;
}

function userShareFrom(total: number, shares: Record<string, string>, selected: string[]) {
  const sum = selected.reduce((s, id) => s + (Number(shares[id]) || 0), 0);
  return round2(total - sum);
}

type SplitFormState = {
  date: string;
  description: string;
  amount: string;
  category: string;
  paymentMode: string;
  selected: string[];
  shares: Record<string, string>;
};

function defaultSplitForm(flatmateIds: string[]): SplitFormState {
  return {
    date: today(),
    description: "",
    amount: "",
    category: CATEGORIES[0],
    paymentMode: PAYMENT_MODES[0],
    selected: [...flatmateIds],
    shares: {},
  };
}

function FlatmateChip({
  name,
  active,
  onClick,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: active ? "2px solid var(--accent)" : "1.5px solid var(--border)",
        background: active ? "var(--parchment)" : "var(--card)",
        color: active ? "var(--accent)" : "var(--text-secondary)",
        fontWeight: active ? 700 : 500,
        fontSize: "0.85rem",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {name}
    </button>
  );
}

function ShareEditor({
  flatmates,
  selected,
  shares,
  total,
  onShareChange,
}: {
  flatmates: Flatmate[];
  selected: string[];
  shares: Record<string, string>;
  total: number;
  onShareChange: (id: string, val: string) => void;
}) {
  const userShare = userShareFrom(total, shares, selected);
  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Split breakdown (incl. you)
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "8px 10px", background: "var(--card)", borderRadius: 8 }}>
        <span style={{ flex: 1, fontSize: "0.85rem", fontWeight: 600 }}>You</span>
        <span style={{ fontWeight: 700, color: "var(--accent)" }}>{inr(userShare)}</span>
      </div>
      {selected.map((id) => {
        const f = flatmates.find((x) => x.id === id);
        return (
          <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ flex: 1, fontSize: "0.85rem" }}>{f?.name}</span>
            <input
              className="cream-input"
              type="number"
              style={{ maxWidth: 110, textAlign: "right" }}
              value={shares[id] ?? ""}
              onChange={(e) => onShareChange(id, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}

export function SplitsSection({ refreshKey = 0, onChanged, embedded = true }: Props) {
  const [flatmates, setFlatmates] = useState<Flatmate[]>([]);
  const [splits, setSplits] = useState<SplitRecord[]>([]);
  const [settlements, setSettlements] = useState<SplitSettlement[]>([]);
  const [plate, setPlate] = useState<{ perFlatmate: PlateBalance[]; netTotal: number; totalReceivable: number; totalPayable: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAddFlatmate, setShowAddFlatmate] = useState(false);
  const [fmForm, setFmForm] = useState({ name: "", phone: "" });

  const [addSplit, setAddSplit] = useState<SplitFormState>(() => defaultSplitForm([]));
  const [theyPaid, setTheyPaid] = useState<SplitFormState & { paidByFlatmateId: string }>(() => ({
    ...defaultSplitForm([]),
    paidByFlatmateId: "",
  }));

  const [clearForm, setClearForm] = useState({
    flatmateId: "",
    amount: "",
    reason: "",
    date: today(),
    direction: "received" as "received" | "paid",
  });

  const allIds = useMemo(() => flatmates.map((f) => f.id), [flatmates]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch<{ flatmates: Flatmate[] }>("/api/flatmates"),
      apiFetch<{ splits: SplitRecord[] }>("/api/splits"),
      apiFetch<{ settlements: SplitSettlement[] }>("/api/splits/settlements"),
      apiFetch<{ perFlatmate: PlateBalance[]; netTotal: number; totalReceivable: number; totalPayable: number }>("/api/splits/plate"),
    ])
      .then(([fm, sp, st, pl]) => {
        setFlatmates(fm.flatmates);
        setSplits(sp.splits);
        setSettlements(st.settlements);
        setPlate(pl);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load splits."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [refreshKey, load]);

  useEffect(() => {
    if (flatmates.length === 0) return;
    setAddSplit((f) => (f.selected.length === 0 ? { ...defaultSplitForm(allIds) } : f));
    setTheyPaid((f) => (f.selected.length === 0 ? { ...defaultSplitForm(allIds), paidByFlatmateId: f.paidByFlatmateId || flatmates[0].id } : f));
    if (!clearForm.flatmateId) {
      setClearForm((f) => ({ ...f, flatmateId: flatmates[0].id }));
    }
  }, [flatmates, allIds, clearForm.flatmateId]);

  useEffect(() => {
    const total = Number(addSplit.amount) || 0;
    if (total > 0 && addSplit.selected.length > 0) {
      setAddSplit((f) => ({ ...f, shares: equalShares(total, f.selected) }));
    }
  }, [addSplit.amount, addSplit.selected.join(",")]);

  useEffect(() => {
    const total = Number(theyPaid.amount) || 0;
    if (total > 0 && theyPaid.selected.length > 0) {
      setTheyPaid((f) => ({ ...f, shares: equalShares(total, f.selected) }));
    }
  }, [theyPaid.amount, theyPaid.selected.join(",")]);

  const clearFlatmatePlate = plate?.perFlatmate.find((p) => p.flatmateId === clearForm.flatmateId);

  useEffect(() => {
    if (!clearFlatmatePlate) return;
    const dir = clearFlatmatePlate.netBalance < 0 ? "paid" : "received";
    setClearForm((f) => (f.direction !== dir ? { ...f, direction: dir } : f));
  }, [clearFlatmatePlate?.netBalance, clearFlatmatePlate?.flatmateId]);

  function toggleAddSplit(id: string) {
    setAddSplit((f) => {
      const selected = f.selected.includes(id) ? f.selected.filter((x: string) => x !== id) : [...f.selected, id];
      const total = Number(f.amount) || 0;
      const shares = total > 0 && selected.length > 0 ? equalShares(total, selected) : {};
      return { ...f, selected, shares };
    });
  }

  function toggleTheyPaid(id: string) {
    setTheyPaid((f) => {
      const selected = f.selected.includes(id) ? f.selected.filter((x: string) => x !== id) : [...f.selected, id];
      const total = Number(f.amount) || 0;
      const shares = total > 0 && selected.length > 0 ? equalShares(total, selected) : {};
      return { ...f, selected, shares };
    });
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
      setShowAddFlatmate(false);
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

  async function submitBill(paidBy: "user" | string, form: SplitFormState) {
    const totalAmount = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      setError("Enter description and valid amount.");
      return;
    }
    if (form.selected.length === 0) {
      setError("Select at least one flatmate.");
      return;
    }
    const userShare = userShareFrom(totalAmount, form.shares, form.selected);
    if (userShare < 0 || Math.abs(userShare + form.selected.reduce((s, id) => s + (Number(form.shares[id]) || 0), 0) - totalAmount) > 0.02) {
      setError("Shares must sum to total.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/splits/bills", {
        method: "POST",
        body: JSON.stringify({
          paidBy,
          description: form.description.trim(),
          totalAmount,
          date: form.date || today(),
          flatmateIds: form.selected,
          shares: form.selected.map((id) => Number(form.shares[id]) || 0),
          category: form.category,
          paymentMode: form.paymentMode,
        }),
      });
      if (paidBy === "user") {
        setAddSplit(defaultSplitForm(allIds));
      } else {
        setTheyPaid({ ...defaultSplitForm(allIds), paidByFlatmateId: theyPaid.paidByFlatmateId || flatmates[0]?.id || "" });
      }
      load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save split.");
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
          direction: clearForm.direction,
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

  async function deleteSettlement(id: string) {
    if (!confirm("Reverse this entry?")) return;
    try {
      await apiFetch(`/api/splits/settlements/${id}`, { method: "DELETE" });
      load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
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

  const netTotal = plate?.netTotal ?? 0;

  return (
    <PageCard id={embedded ? "splits" : undefined} style={embedded ? { position: "relative", paddingBottom: 56 } : { marginBottom: 0, position: "relative", paddingBottom: 56 }}>
      {embedded && <SectionTitle>Splits</SectionTitle>}
      {error && <Alert type="error">{error}</Alert>}

      {/* Flatmates at top */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          My flatmates
        </p>
        {flatmates.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No flatmates yet — add one using the button below.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {flatmates.map((f) => (
              <span key={f.id} className="badge badge-blue" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", fontSize: "0.85rem" }}>
                {f.name}
                {f.phone ? <span style={{ opacity: 0.7, fontWeight: 400 }}>{f.phone}</span> : null}
                <button type="button" onClick={() => removeFlatmate(f.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: "0.8rem", lineHeight: 1 }} aria-label={`Remove ${f.name}`}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Plate balance */}
      <div style={{
        background: "linear-gradient(135deg, var(--parchment) 0%, var(--card) 100%)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-card)",
        padding: "20px 22px",
        marginBottom: 24,
      }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
          Split plate
        </p>
        <p style={{ fontSize: "2rem", fontWeight: 800, color: netTotal >= 0 ? "var(--green)" : "var(--orange)", margin: "0 0 4px" }}>
          {netTotal >= 0 ? "+" : ""}{inr(netTotal)}
        </p>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 14 }}>
          {netTotal > 0 ? "Net to receive from flatmates" : netTotal < 0 ? "Net you owe flatmates" : "All settled up on the plate"}
        </p>
        {plate && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {plate.perFlatmate.filter((p) => p.theyOweYou > 0 || p.youOweThem > 0).map((p) => (
              <div key={p.flatmateId} style={{ fontSize: "0.8rem", padding: "6px 10px", background: "var(--card)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                <strong>{p.name}</strong>
                {p.theyOweYou > 0 && <span style={{ color: "var(--green)", marginLeft: 6 }}>+{inr(p.theyOweYou)}</span>}
                {p.youOweThem > 0 && <span style={{ color: "var(--orange)", marginLeft: 6 }}>−{inr(p.youOweThem)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {flatmates.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 24 }}>Add flatmates to start splitting.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
          {/* Add Split — I paid */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "18px 20px" }}>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 4 }}>Add Split</p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 14 }}>You paid — flatmates owe you their share</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><FieldLabel>Description</FieldLabel><input className="cream-input" value={addSplit.description} onChange={(e) => setAddSplit({ ...addSplit, description: e.target.value })} placeholder="Wifi, groceries..." /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><FieldLabel>Total paid (₹)</FieldLabel><input className="cream-input" type="number" value={addSplit.amount} onChange={(e) => setAddSplit({ ...addSplit, amount: e.target.value })} /></div>
                <div><FieldLabel>Date</FieldLabel><CreamDatePicker value={addSplit.date} onChange={(date) => setAddSplit({ ...addSplit, date })} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><FieldLabel>Category</FieldLabel><CreamSelect value={addSplit.category} onChange={(category) => setAddSplit({ ...addSplit, category })} options={CATEGORIES} /></div>
                <div><FieldLabel>Payment</FieldLabel><CreamSelect value={addSplit.paymentMode} onChange={(paymentMode) => setAddSplit({ ...addSplit, paymentMode })} options={PAYMENT_MODES} /></div>
              </div>
              <div>
                <FieldLabel>Who&apos;s in this split?</FieldLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                  {flatmates.map((f) => (
                    <FlatmateChip key={f.id} name={f.name} active={addSplit.selected.includes(f.id)} onClick={() => toggleAddSplit(f.id)} />
                  ))}
                </div>
              </div>
              {Number(addSplit.amount) > 0 && addSplit.selected.length > 0 && (
                <ShareEditor
                  flatmates={flatmates}
                  selected={addSplit.selected}
                  shares={addSplit.shares}
                  total={Number(addSplit.amount)}
                  onShareChange={(id, val) => setAddSplit((f) => ({ ...f, shares: { ...f.shares, [id]: val } }))}
                />
              )}
              <button className="btn-accent" onClick={() => submitBill("user", addSplit)} disabled={saving} style={{ width: "100%" }}>
                {saving ? "Saving..." : "Add split"}
              </button>
            </div>
          </div>

          {/* They paid — plate only */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "18px 20px" }}>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 4 }}>Flatmate Paid</p>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 14 }}>They paid — your share cuts from the plate (no balance debit)</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div><FieldLabel>Who paid?</FieldLabel>
                <CreamSelect
                  value={theyPaid.paidByFlatmateId}
                  onChange={(paidByFlatmateId) => setTheyPaid({ ...theyPaid, paidByFlatmateId })}
                  options={flatmates.map((f) => ({ value: f.id, label: f.name }))}
                />
              </div>
              <div><FieldLabel>Description</FieldLabel><input className="cream-input" value={theyPaid.description} onChange={(e) => setTheyPaid({ ...theyPaid, description: e.target.value })} placeholder="Groceries, dinner..." /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><FieldLabel>Total (₹)</FieldLabel><input className="cream-input" type="number" value={theyPaid.amount} onChange={(e) => setTheyPaid({ ...theyPaid, amount: e.target.value })} /></div>
                <div><FieldLabel>Date</FieldLabel><CreamDatePicker value={theyPaid.date} onChange={(date) => setTheyPaid({ ...theyPaid, date })} /></div>
              </div>
              <div>
                <FieldLabel>Split among</FieldLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                  {flatmates.map((f) => (
                    <FlatmateChip key={f.id} name={f.name} active={theyPaid.selected.includes(f.id)} onClick={() => toggleTheyPaid(f.id)} />
                  ))}
                </div>
              </div>
              {Number(theyPaid.amount) > 0 && theyPaid.selected.length > 0 && (
                <ShareEditor
                  flatmates={flatmates}
                  selected={theyPaid.selected}
                  shares={theyPaid.shares}
                  total={Number(theyPaid.amount)}
                  onShareChange={(id, val) => setTheyPaid((f) => ({ ...f, shares: { ...f.shares, [id]: val } }))}
                />
              )}
              <button className="btn-accent" onClick={() => submitBill(theyPaid.paidByFlatmateId, theyPaid)} disabled={saving || !theyPaid.paidByFlatmateId} style={{ width: "100%" }}>
                {saving ? "Saving..." : "Log their expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Clear */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "18px 20px", marginBottom: 24 }}>
        <p style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 4 }}>Split Clear</p>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 14 }}>
          Log money received from or paid to a flatmate
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {(["received", "paid"] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={clearForm.direction === d ? "btn-accent" : "btn-ghost"}
              style={{ padding: "6px 14px", fontSize: "0.8rem" }}
              onClick={() => setClearForm({ ...clearForm, direction: d })}
            >
              {d === "received" ? "Received from them" : "Paid to them"}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 10 }}>
          <div><FieldLabel>Flatmate</FieldLabel>
            <CreamSelect value={clearForm.flatmateId} onChange={(flatmateId) => setClearForm({ ...clearForm, flatmateId })} options={flatmates.map((f) => ({ value: f.id, label: f.name }))} />
          </div>
          <div><FieldLabel>Amount (₹)</FieldLabel><input className="cream-input" type="number" value={clearForm.amount} onChange={(e) => setClearForm({ ...clearForm, amount: e.target.value })} /></div>
          <div><FieldLabel>Reason</FieldLabel><input className="cream-input" value={clearForm.reason} onChange={(e) => setClearForm({ ...clearForm, reason: e.target.value })} placeholder="UPI, grocery..." /></div>
          <div><FieldLabel>Date</FieldLabel><CreamDatePicker value={clearForm.date} onChange={(date) => setClearForm({ ...clearForm, date })} /></div>
        </div>
        {clearFlatmatePlate && (
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 10 }}>
            {clearFlatmatePlate.name}: they owe {inr(clearFlatmatePlate.theyOweYou)} · you owe {inr(clearFlatmatePlate.youOweThem)} · net {inr(clearFlatmatePlate.netBalance)}
          </p>
        )}
        <button className="btn-accent" onClick={submitClear} disabled={saving || flatmates.length === 0} style={{ width: "100%", maxWidth: 320 }}>
          {saving ? "Saving..." : "Log split clear"}
        </button>
      </div>

      {/* History */}
      {loading ? (
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>Loading...</p>
      ) : (
        <>
          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>Split history</p>
          {splits.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20 }}>No splits logged yet.</p>
          ) : (
            <div style={{ marginBottom: 24 }}>
              {splits.map(({ bill, members, expense }) => {
                const paidByName = bill.paidBy === "user"
                  ? "You"
                  : flatmates.find((f) => f.id === bill.paidBy)?.name ?? "Flatmate";
                return (
                  <div key={bill.id} style={{ borderBottom: "1px solid var(--border-light)", padding: "12px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>{bill.description}</p>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {new Date(bill.date).toLocaleDateString("en-IN")} · {paidByName} paid {inr(bill.totalAmount)}
                          {expense ? ` · Your expense ${inr(bill.userShare)}` : ` · Your plate share ${inr(bill.userShare)}`}
                        </p>
                      </div>
                      <span className={`badge ${bill.paidBy === "user" ? "badge-blue" : "badge-orange"}`}>
                        {bill.paidBy === "user" ? "You paid" : "They paid"}
                      </span>
                    </div>
                    {members.map((m) => (
                      <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0 4px 12px", fontSize: "0.85rem" }}>
                        <span>
                          {m.entryType === "payable"
                            ? `You owe ${m.flatmate?.name ?? "them"} ${inr(m.amountOwed)}`
                            : `${m.flatmate?.name ?? "Unknown"} owes ${inr(m.amountOwed)}`}
                        </span>
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
                );
              })}
            </div>
          )}

          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>Clear history</p>
          {settlements.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No clears logged yet.</p>
          ) : (
            settlements.map((s) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border-light)" }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                    {s.direction === "paid" ? "Paid" : "Received"} {s.flatmateName} — {inr(s.amount)}
                  </p>
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

      {/* Add flatmate — bottom corner */}
      <div style={{ position: "absolute", bottom: 16, right: 16, zIndex: 2 }}>
        {showAddFlatmate ? (
          <div style={{
            background: "var(--card)",
            border: "1.5px solid var(--border)",
            borderRadius: 12,
            padding: 14,
            boxShadow: "var(--shadow-lg)",
            width: 260,
          }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: 10 }}>Add flatmate</p>
            <input className="cream-input" placeholder="Name" value={fmForm.name} onChange={(e) => setFmForm({ ...fmForm, name: e.target.value })} style={{ marginBottom: 8 }} />
            <input className="cream-input" placeholder="Phone (optional)" value={fmForm.phone} onChange={(e) => setFmForm({ ...fmForm, phone: e.target.value })} style={{ marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-accent" style={{ flex: 1 }} onClick={addFlatmate} disabled={saving}>Add</button>
              <button className="btn-ghost" onClick={() => setShowAddFlatmate(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setShowAddFlatmate(true)}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              background: "var(--card)",
              border: "1.5px solid var(--border)",
              boxShadow: "var(--shadow-md)",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            + Add flatmate
          </button>
        )}
      </div>
    </PageCard>
  );
}
