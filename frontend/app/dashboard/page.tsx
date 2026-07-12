"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";
import { CATEGORIES, PAYMENT_MODES, INCOME_SOURCES } from "@/lib/constants";
import { inr, today, expenseShare } from "@/lib/format";
import type { DashboardData, Flatmate } from "@/lib/types";
import { PageLoading } from "@/components/ui/PageShell";
import { CreamSelect } from "@/components/ui/CreamSelect";
import { CreamDatePicker } from "@/components/ui/CreamDatePicker";
import { ExpensesSection } from "@/components/dashboard/ExpensesSection";
import { WeeklySection } from "@/components/dashboard/WeeklySection";
import { MonthlySection } from "@/components/dashboard/MonthlySection";
import { IncomeSection } from "@/components/dashboard/IncomeSection";
import { SplitsSection } from "@/components/dashboard/SplitsSection";
import { LendingSection } from "@/components/dashboard/LendingSection";

type ParsedExpense = { date: string | null; description: string | null; category: string | null; amount: number | null; paymentMode: string | null; notes?: string | null };
type ParsedSplitExpense = ParsedExpense & { matchedFlatmates?: Flatmate[]; unmatchedFlatmates?: string[] };
type ParsedIncome = { date: string | null; source: string | null; amount: number | null; notes?: string | null };
type ParsedLending = { personName: string | null; amount: number | null; reason?: string | null; date: string | null };
type ParsedSplitClear = { flatmateId: string | null; flatmateName: string | null; amount: number | null; reason?: string | null; date: string | null; unmatched?: boolean };
type ParsedIntent =
  | { intent: "expense"; data: ParsedExpense }
  | { intent: "split_expense"; data: ParsedSplitExpense }
  | { intent: "income"; data: ParsedIncome }
  | { intent: "lending"; data: ParsedLending }
  | { intent: "split_clear"; data: ParsedSplitClear };

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "income", label: "Income" },
  { id: "expenses", label: "Expenses" },
  { id: "splits", label: "Splits" },
  { id: "lending", label: "Lending" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

function round2(n: number) { return Math.round(n * 100) / 100; }

const INTENT_LABELS: Record<string, string> = {
  expense: "💳 Expense Detected",
  split_expense: "🤝 Split Expense Detected",
  income: "💰 Income Detected",
  lending: "📤 Lending Detected",
  split_clear: "✅ Split Clear Detected",
};

function BalanceCard({ balance, startingBalance, totalIncome, totalExpenses, flash }: {
  balance: number; startingBalance: number; totalIncome: number; totalExpenses: number; flash?: boolean;
}) {
  const low = balance < 1000;
  return (
    <div
      className={flash ? "animate-flash" : ""}
      style={{
        background: "linear-gradient(135deg, var(--cream) 0%, var(--card) 100%)",
        border: "1.5px solid var(--border)",
        borderRadius: "var(--radius-card)",
        padding: "24px 28px",
        marginBottom: 24,
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            Current balance
          </p>
          <p
            className={flash ? "animate-count-up" : ""}
            style={{ fontSize: "2.75rem", fontWeight: 800, color: low ? "var(--red)" : "var(--text-primary)", lineHeight: 1, letterSpacing: "-0.02em" }}
          >
            {inr(balance)}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 8, maxWidth: 420, lineHeight: 1.5 }}>
            Log every transaction and this stays in sync with your real account.
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className={`badge ${low ? "badge-red" : "badge-green"}`}>{low ? "Running low" : "On track"}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border-light)", flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Starting</p>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-secondary)" }}>{inr(startingBalance)}</p>
        </div>
        <div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>+ Income</p>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--green)" }}>{inr(totalIncome)}</p>
        </div>
        <div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>− Expenses</p>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--orange)" }}>{inr(totalExpenses)}</p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <a href="/settings" style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600 }}>Adjust baseline →</a>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, flash }: { label: string; value: string; sub?: string; flash?: boolean }) {
  return (
    <div className={flash ? "animate-flash" : ""} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "18px 20px", boxShadow: "var(--shadow-sm)" }}>
      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p className={flash ? "animate-count-up" : ""} style={{ fontSize: "1.7rem", fontWeight: 700, color: "var(--text-primary)", margin: "4px 0 2px" }}>{value}</p>
      {sub && <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

function SplitBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{inr(amount)}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill animate-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function ConfirmCard({
  intent, expenseForm, incomeForm, lendingForm, clearForm, splitFlatmateIds, splitShares, flatmates,
  onConfirm, onCancel, saving, setExpenseForm, setIncomeForm, setLendingForm, setClearForm,
  setSplitFlatmateIds, setSplitShares, unmatchedFlatmates,
}: {
  intent: string | null;
  expenseForm: { date: string; description: string; category: string; amount: string; paymentMode: string; notes: string };
  incomeForm: { date: string; source: string; amount: string; notes: string };
  lendingForm: { date: string; personName: string; amount: string; reason: string };
  clearForm: { date: string; flatmateId: string; amount: string; reason: string };
  splitFlatmateIds: string[];
  splitShares: Record<string, string>;
  flatmates: Flatmate[];
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
  setExpenseForm: React.Dispatch<React.SetStateAction<typeof expenseForm>>;
  setIncomeForm: React.Dispatch<React.SetStateAction<typeof incomeForm>>;
  setLendingForm: React.Dispatch<React.SetStateAction<typeof lendingForm>>;
  setClearForm: React.Dispatch<React.SetStateAction<typeof clearForm>>;
  setSplitFlatmateIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSplitShares: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  unmatchedFlatmates: string[];
}) {
  if (!intent) return null;

  const total = Number(expenseForm.amount) || 0;
  const flatmateSum = splitFlatmateIds.reduce((s, id) => s + (Number(splitShares[id]) || 0), 0);
  const userShare = round2(total - flatmateSum);

  function toggleSplitFm(id: string) {
    setSplitFlatmateIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!prev.includes(id) && next.includes(id) && total > 0) {
        const per = round2(total / (next.length + 1));
        setSplitShares((sh) => ({ ...sh, [id]: String(per) }));
      }
      if (!next.includes(id)) {
        setSplitShares((sh) => { const c = { ...sh }; delete c[id]; return c; });
      }
      return next;
    });
  }

  const confirmAmt =
    intent === "income" ? Number(incomeForm.amount || 0)
    : intent === "lending" ? Number(lendingForm.amount || 0)
    : intent === "split_clear" ? Number(clearForm.amount || 0)
    : intent === "split_expense" ? userShare
    : Number(expenseForm.amount || 0);

  return (
    <div className="animate-fade-up" style={{ background: "var(--card)", border: "1.5px solid var(--accent)", borderRadius: "var(--radius-card)", padding: "20px 24px", boxShadow: "var(--shadow-lg)", marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>{INTENT_LABELS[intent] ?? intent}</p>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Say &quot;confirm&quot; or &quot;cancel&quot;</span>
      </div>

      {(intent === "expense" || intent === "split_expense") && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>DESCRIPTION</p><input className="cream-input" value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>TOTAL PAID (₹)</p><input className="cream-input" type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>CATEGORY</p><CreamSelect value={expenseForm.category} onChange={category => setExpenseForm(f => ({ ...f, category }))} options={CATEGORIES} /></div>
            <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>PAYMENT</p><CreamSelect value={expenseForm.paymentMode} onChange={paymentMode => setExpenseForm(f => ({ ...f, paymentMode }))} options={PAYMENT_MODES} /></div>
            <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>DATE</p><CreamDatePicker value={expenseForm.date} onChange={date => setExpenseForm(f => ({ ...f, date }))} /></div>
          </div>
          {intent === "split_expense" && (
            <div style={{ marginTop: 12, padding: 12, background: "var(--parchment)", borderRadius: 10 }}>
              {unmatchedFlatmates.length > 0 && (
                <p style={{ fontSize: "0.8rem", color: "var(--red)", marginBottom: 8 }}>Unmatched: {unmatchedFlatmates.join(", ")}</p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {flatmates.map(f => (
                  <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
                    <input type="checkbox" checked={splitFlatmateIds.includes(f.id)} onChange={() => toggleSplitFm(f.id)} />
                    {f.name}
                  </label>
                ))}
              </div>
              {splitFlatmateIds.map(id => {
                const f = flatmates.find(x => x.id === id);
                return (
                  <div key={id} style={{ display: "flex", gap: 10, marginBottom: 4, alignItems: "center" }}>
                    <span style={{ minWidth: 70, fontSize: "0.85rem" }}>{f?.name}</span>
                    <input className="cream-input" type="number" style={{ maxWidth: 100 }} value={splitShares[id] ?? ""} onChange={e => setSplitShares(sh => ({ ...sh, [id]: e.target.value }))} />
                  </div>
                );
              })}
              <p style={{ fontSize: "0.85rem", marginTop: 8 }}>Your share: <strong>{inr(userShare)}</strong> · Balance debits: <strong>{inr(total)}</strong></p>
            </div>
          )}
        </>
      )}

      {intent === "income" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>AMOUNT (₹)</p><input className="cream-input" type="number" value={incomeForm.amount} onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>SOURCE</p><CreamSelect value={incomeForm.source} onChange={source => setIncomeForm(f => ({ ...f, source }))} options={INCOME_SOURCES} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>DATE</p><CreamDatePicker value={incomeForm.date} onChange={date => setIncomeForm(f => ({ ...f, date }))} /></div>
        </div>
      )}

      {intent === "lending" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>PERSON</p><input className="cream-input" value={lendingForm.personName} onChange={e => setLendingForm(f => ({ ...f, personName: e.target.value }))} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>AMOUNT (₹)</p><input className="cream-input" type="number" value={lendingForm.amount} onChange={e => setLendingForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>REASON</p><input className="cream-input" value={lendingForm.reason} onChange={e => setLendingForm(f => ({ ...f, reason: e.target.value }))} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>DATE</p><CreamDatePicker value={lendingForm.date} onChange={date => setLendingForm(f => ({ ...f, date }))} /></div>
        </div>
      )}

      {intent === "split_clear" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>FLATMATE</p>
            <CreamSelect value={clearForm.flatmateId} onChange={flatmateId => setClearForm(f => ({ ...f, flatmateId }))} options={flatmates.map(f => ({ value: f.id, label: f.name }))} />
          </div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>AMOUNT (₹)</p><input className="cream-input" type="number" value={clearForm.amount} onChange={e => setClearForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>REASON</p><input className="cream-input" value={clearForm.reason} onChange={e => setClearForm(f => ({ ...f, reason: e.target.value }))} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>DATE</p><CreamDatePicker value={clearForm.date} onChange={date => setClearForm(f => ({ ...f, date }))} /></div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="btn-ghost" onClick={onCancel} disabled={saving} style={{ flex: "0 0 auto", padding: "8px 20px" }}>Cancel</button>
        <button className="btn-accent" onClick={onConfirm} disabled={saving} style={{ flex: 1 }}>
          {saving ? "Saving..." : `✓ Confirm ${inr(confirmAmt)}`}
        </button>
      </div>
    </div>
  );
}

function categoryIcon(category: string) {
  if (category === "Lifestyle Enjoyment") return "🍕";
  if (category === "Life Infrastructure") return "🏠";
  if (category === "Performance & Growth") return "📚";
  if (category === "Relationships & Generosity") return "❤️";
  return "💾";
}

export default function Home() {
  const { isLoading: authLoading, user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flashStats, setFlashStats] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [agentText, setAgentText] = useState("");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [parsing, setParsing] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [intentData, setIntentData] = useState<ParsedIntent | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const appStateRef = useRef<"IDLE" | "PARSING" | "PENDING">("IDLE");

  const [expenseForm, setExpenseForm] = useState<{ date: string; description: string; category: string; amount: string; paymentMode: string; notes: string }>({ date: today(), description: "", category: CATEGORIES[0], amount: "", paymentMode: PAYMENT_MODES[0], notes: "" });
  const [incomeForm, setIncomeForm] = useState<{ date: string; source: string; amount: string; notes: string }>({ date: today(), source: INCOME_SOURCES[0], amount: "", notes: "" });
  const [lendingForm, setLendingForm] = useState({ date: today(), personName: "", amount: "", reason: "" });
  const [clearForm, setClearForm] = useState({ date: today(), flatmateId: "", amount: "", reason: "" });
  const [splitFlatmateIds, setSplitFlatmateIds] = useState<string[]>([]);
  const [splitShares, setSplitShares] = useState<Record<string, string>>({});
  const [unmatchedFlatmates, setUnmatchedFlatmates] = useState<string[]>([]);
  const [flatmates, setFlatmates] = useState<Flatmate[]>([]);

  const fetchDashboard = useCallback(() => {
    apiFetch<DashboardData>("/api/dashboard")
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const refreshAll = useCallback(() => {
    fetchDashboard();
    setRefreshKey(k => k + 1);
  }, [fetchDashboard]);

  useEffect(() => {
    if (!authLoading) {
      fetchDashboard();
      apiFetch<{ flatmates: Flatmate[] }>("/api/flatmates").then(r => setFlatmates(r.flatmates)).catch(() => {});
    }
  }, [authLoading, fetchDashboard]);

  const fillExpenseForm = (p: ParsedExpense) => {
    setExpenseForm({
      date: p.date || today(),
      description: p.description || "",
      category: CATEGORIES.includes(p.category as typeof CATEGORIES[number]) ? p.category! : CATEGORIES[0],
      amount: p.amount != null ? String(p.amount) : "",
      paymentMode: PAYMENT_MODES.includes(p.paymentMode as typeof PAYMENT_MODES[number]) ? p.paymentMode! : PAYMENT_MODES[0],
      notes: p.notes || "",
    });
  };

  const sendForParse = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setAgentError(null);
    setParsing(true);
    appStateRef.current = "PARSING";
    try {
      const res = await apiFetch<ParsedIntent>("/api/parse", { method: "POST", body: JSON.stringify({ text }) });
      setIntentData(res);
      if (res.intent === "expense") {
        fillExpenseForm(res.data);
      } else if (res.intent === "split_expense") {
        fillExpenseForm(res.data);
        const matched = res.data.matchedFlatmates ?? [];
        setUnmatchedFlatmates(res.data.unmatchedFlatmates ?? []);
        const ids = matched.map(f => f.id);
        setSplitFlatmateIds(ids);
        const total = res.data.amount ?? 0;
        const per = ids.length > 0 ? round2(total / (ids.length + 1)) : 0;
        const shares: Record<string, string> = {};
        ids.forEach(id => { shares[id] = String(per); });
        setSplitShares(shares);
      } else if (res.intent === "income") {
        const p = res.data;
        setIncomeForm({ date: p.date || today(), source: INCOME_SOURCES.includes(p.source as typeof INCOME_SOURCES[number]) ? p.source! : INCOME_SOURCES[0], amount: p.amount != null ? String(p.amount) : "", notes: p.notes || "" });
      } else if (res.intent === "lending") {
        const p = res.data;
        setLendingForm({ date: p.date || today(), personName: p.personName || "", amount: p.amount != null ? String(p.amount) : "", reason: p.reason || "" });
      } else if (res.intent === "split_clear") {
        const p = res.data;
        setClearForm({ date: p.date || today(), flatmateId: p.flatmateId || flatmates[0]?.id || "", amount: p.amount != null ? String(p.amount) : "", reason: p.reason || "" });
        setUnmatchedFlatmates(p.unmatched ? [p.flatmateName || ""] : []);
      }
      appStateRef.current = "PENDING";
    } catch (e) {
      setAgentError(e instanceof ApiError ? e.message : "Could not parse. Try again.");
      appStateRef.current = "IDLE";
    } finally { setParsing(false); }
  }, [flatmates]);

  const confirmSave = useCallback(async () => {
    if (!intentData) return;
    setSaving(true);
    try {
      if (intentData.intent === "expense") {
        await apiFetch("/api/expenses", { method: "POST", body: JSON.stringify({ date: expenseForm.date || today(), description: expenseForm.description, category: expenseForm.category, amount: Number(expenseForm.amount), paymentMode: expenseForm.paymentMode, notes: expenseForm.notes || undefined }) });
        setSuccessMsg(`✓ Expense saved — ${inr(Number(expenseForm.amount))}`);
      } else if (intentData.intent === "split_expense") {
        if (splitFlatmateIds.length === 0 || unmatchedFlatmates.length > 0) {
          setAgentError("Fix flatmate selection before saving.");
          setSaving(false);
          return;
        }
        await apiFetch("/api/expenses", {
          method: "POST",
          body: JSON.stringify({
            date: expenseForm.date || today(),
            description: expenseForm.description,
            category: expenseForm.category,
            amount: Number(expenseForm.amount),
            paymentMode: expenseForm.paymentMode,
            notes: expenseForm.notes || undefined,
            split: { flatmateIds: splitFlatmateIds, shares: splitFlatmateIds.map(id => Number(splitShares[id]) || 0) },
          }),
        });
        setSuccessMsg(`✓ Split expense saved — your share ${inr(round2(Number(expenseForm.amount) - splitFlatmateIds.reduce((s, id) => s + (Number(splitShares[id]) || 0), 0)))}`);
      } else if (intentData.intent === "income") {
        await apiFetch("/api/income", { method: "POST", body: JSON.stringify({ date: incomeForm.date || today(), source: incomeForm.source, amount: Number(incomeForm.amount), notes: incomeForm.notes || undefined }) });
        setSuccessMsg(`✓ Income saved — ${inr(Number(incomeForm.amount))}`);
      } else if (intentData.intent === "lending") {
        await apiFetch("/api/lending", { method: "POST", body: JSON.stringify({ date: lendingForm.date || today(), personName: lendingForm.personName, amount: Number(lendingForm.amount), reason: lendingForm.reason }) });
        setSuccessMsg(`✓ Lending saved — ${inr(Number(lendingForm.amount))}`);
      } else if (intentData.intent === "split_clear") {
        if (!clearForm.flatmateId) {
          setAgentError("Select a flatmate.");
          setSaving(false);
          return;
        }
        await apiFetch("/api/splits/settlements", { method: "POST", body: JSON.stringify({ flatmateId: clearForm.flatmateId, amount: Number(clearForm.amount), reason: clearForm.reason, date: clearForm.date || today(), direction: "received" }) });
        setSuccessMsg(`✓ Split clear saved — ${inr(Number(clearForm.amount))}`);
      }
      setIntentData(null); setAgentText(""); appStateRef.current = "IDLE";
      setSplitFlatmateIds([]); setSplitShares({}); setUnmatchedFlatmates([]);
      setFlashStats(true);
      setTimeout(() => setFlashStats(false), 1200);
      refreshAll();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setAgentError(e instanceof ApiError ? e.message : "Save failed.");
    } finally { setSaving(false); }
  }, [intentData, expenseForm, incomeForm, lendingForm, clearForm, splitFlatmateIds, splitShares, unmatchedFlatmates, refreshAll]);

  const cancelConfirm = useCallback(() => {
    setIntentData(null); appStateRef.current = "IDLE";
    setAgentText(""); setAgentError("Cancelled.");
    setTimeout(() => setAgentError(null), 2000);
  }, []);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false; rec.interimResults = true; rec.lang = "en-IN";
    rec.onresult = (event: any) => {
      let interimText = ""; let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interimText += event.results[i][0].transcript;
      }
      setInterim(interimText);
      if (final) {
        const t = final.trim().toLowerCase();
        if (appStateRef.current === "PENDING") {
          if (t.includes("confirm") || t.includes("ok") || t.includes("yes")) confirmSave();
          else if (t.includes("cancel") || t.includes("no")) cancelConfirm();
        } else if (appStateRef.current === "IDLE") {
          setAgentText(final);
          sendForParse(final);
        }
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
  }, [sendForParse, confirmSave, cancelConfirm]);

  function toggleMic() {
    if (listening) { recognitionRef.current?.stop(); setListening(false); setInterim(""); }
    else { recognitionRef.current?.start(); setListening(true); setAgentError(null); }
  }

  if (authLoading || (loading && !data)) return <PageLoading message="Loading dashboard..." />;
  if (!user) return null;

  const d = data!;
  const weeklyPct = d?.weeklyLimit > 0 ? Math.min(100, (d.weeklySpend / d.weeklyLimit) * 100) : 0;
  const weeklyOver = d ? d.weeklySpend > d.weeklyLimit : false;
  const monthlyTotal = d ? d.typeSplit.Need + d.typeSplit.Want + d.typeSplit.Saving : 0;
  const coinPositive = d.coinBalance >= 0;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 960, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Dashboard / Voice-first expense tracker</p>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", margin: "4px 0 0" }}>
            Welcome back, {user.name.split(" ")[0]} 👋
          </h1>
        </div>
        <div className="badge badge-coin" style={{ padding: "6px 14px", fontSize: "0.85rem" }} title={coinPositive ? "Learning is outpacing want spending" : "Spending more wants than learning"}>
          🪙 {d.coinBalance} coins
        </div>
      </div>

      {/* Balance card */}
      <BalanceCard
        balance={d.currentBalance ?? 0}
        startingBalance={d.startingBalance ?? 0}
        totalIncome={d.totalIncome ?? 0}
        totalExpenses={d.totalExpenses ?? 0}
        flash={flashStats}
      />

      {/* Section nav */}
      <nav className="section-nav">
        {SECTIONS.map(s => (
          <a key={s.id} href={`#${s.id}`}>{s.label}</a>
        ))}
      </nav>

      {/* Voice logger */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "16px 20px", marginBottom: 28, boxShadow: "var(--shadow-md)" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          🤖 Log an expense or income
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className={`mic-btn${listening ? " active" : ""}`} onClick={toggleMic} title={listening ? "Stop" : "Speak"}>🎤</button>
          <input className="cream-input" value={interim || agentText} onChange={e => setAgentText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && agentText.trim()) sendForParse(agentText); }}
            placeholder={listening ? "Listening..." : "Try: 'Wifi 430 split with Rahul UPI' or 'Lent Rahul 500 for dinner'"}
            style={{ flex: 1 }} />
          <button className="btn-accent" onClick={() => sendForParse(agentText)} disabled={parsing || !agentText.trim()} style={{ flexShrink: 0, padding: "10px 18px" }}>
            {parsing ? "..." : "Parse"}
          </button>
        </div>
        {agentError && <p style={{ marginTop: 8, fontSize: "0.8rem", color: "var(--red)" }}>{agentError}</p>}
        {successMsg && <p style={{ marginTop: 8, fontSize: "0.8rem", color: "var(--green)", fontWeight: 600 }}>{successMsg}</p>}
        <ConfirmCard
          intent={intentData?.intent ?? null}
          expenseForm={expenseForm}
          incomeForm={incomeForm}
          lendingForm={lendingForm}
          clearForm={clearForm}
          splitFlatmateIds={splitFlatmateIds}
          splitShares={splitShares}
          flatmates={flatmates}
          unmatchedFlatmates={unmatchedFlatmates}
          onConfirm={confirmSave}
          onCancel={cancelConfirm}
          saving={saving}
          setExpenseForm={setExpenseForm}
          setIncomeForm={setIncomeForm}
          setLendingForm={setLendingForm}
          setClearForm={setClearForm}
          setSplitFlatmateIds={setSplitFlatmateIds}
          setSplitShares={setSplitShares}
        />
      </div>

      <div id="overview">
        {/* Monthly & weekly income */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "18px 22px", boxShadow: "var(--shadow-sm)" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Combined monthly income</p>
            <p className={flashStats ? "animate-count-up" : ""} style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", margin: "4px 0" }}>{inr(d.monthlyIncome ?? 0)}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {Object.entries(d.incomeBySource ?? {}).length === 0 ? (
                <span className="badge badge-green">No income logged this month</span>
              ) : (
                Object.entries(d.incomeBySource ?? {}).map(([src, amt]) => (
                  <span key={src} className="badge badge-green">{src}: {inr(amt)}</span>
                ))
              )}
            </div>
          </div>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "18px 22px", boxShadow: "var(--shadow-sm)" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Combined weekly income</p>
            <p className={flashStats ? "animate-count-up" : ""} style={{ fontSize: "2rem", fontWeight: 800, color: "var(--green)", margin: "4px 0" }}>{inr(d.weeklyIncome ?? 0)}</p>
            <span className="badge badge-blue">This week (Mon–Sun)</span>
          </div>
        </div>

        {/* Weekly budget */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "18px 22px", marginBottom: 20, boxShadow: "var(--shadow-sm)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Weekly spend vs. limit</p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 2 }}>Keep the beast under control.</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p className={flashStats ? "animate-count-up" : ""} style={{ fontSize: "2rem", fontWeight: 800, color: weeklyOver ? "var(--red)" : "var(--text-primary)" }}>{Math.round(weeklyPct)}%</p>
              <span className={`badge ${weeklyOver ? "badge-red" : "badge-green"}`}>{weeklyOver ? "Over budget" : "Under budget"}</span>
            </div>
          </div>
          <div className="progress-track" style={{ height: 12 }}>
            <div className="progress-fill" style={{ width: `${weeklyPct}%`, background: weeklyOver ? "var(--red)" : "var(--green)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Spent {inr(d.weeklySpend)}</span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Limit {inr(d.weeklyLimit)}</span>
          </div>
        </div>

        {/* Need / Want / Saving */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "18px 22px", marginBottom: 20, boxShadow: "var(--shadow-sm)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Need / Want / Saving</p>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 2 }}>This month split (Warikoo categories)</p>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[{ label: "Need", val: d.typeSplit.Need, color: "var(--blue)" }, { label: "Want", val: d.typeSplit.Want, color: "var(--orange)" }, { label: "Saving", val: d.typeSplit.Saving, color: "var(--green)" }].map(({ label, val, color }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
                  <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 500 }}>{label} {monthlyTotal > 0 ? Math.round((val / monthlyTotal) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
          <SplitBar label="Need" amount={d.typeSplit.Need} total={monthlyTotal} color="var(--blue)" />
          <SplitBar label="Want" amount={d.typeSplit.Want} total={monthlyTotal} color="var(--orange)" />
          <SplitBar label="Saving" amount={d.typeSplit.Saving} total={monthlyTotal} color="var(--green)" />
        </div>

        {/* Splits & lending summaries */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "18px 22px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Split plate</p>
              <a href="#splits" style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600 }}>View →</a>
            </div>
            <p style={{ fontSize: "1.5rem", fontWeight: 800, color: (d.splitsNetTotal ?? 0) >= 0 ? "var(--green)" : "var(--orange)", margin: "0 0 8px" }}>
              {(d.splitsNetTotal ?? 0) >= 0 ? "+" : ""}{inr(d.splitsNetTotal ?? 0)}
            </p>
            {(d.splitsSummary ?? []).length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Plate is settled</p>
            ) : (
              (d.splitsSummary ?? []).map(s => (
                <div key={s.flatmateId} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "0.82rem" }}>
                  <span>{s.name}</span>
                  <span style={{ fontWeight: 700, color: (s.netBalance ?? s.pendingTotal) >= 0 ? "var(--green)" : "var(--orange)" }}>
                    {(s.netBalance ?? s.pendingTotal) >= 0 ? "+" : ""}{inr(s.netBalance ?? s.pendingTotal)}
                  </span>
                </div>
              ))
            )}
          </div>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "18px 22px", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Lending pending</p>
              <a href="#lending" style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600 }}>View →</a>
            </div>
            <p style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{inr(d.lendingSummary?.totalPending ?? 0)}</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>Total to receive</p>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
          <StatCard label="Today" value={inr(d.todaySpend)} sub="today's logged" flash={flashStats} />
          <StatCard label="This Week" value={inr(d.weeklySpend)} sub={`${Math.round(weeklyPct)}% of limit`} flash={flashStats} />
          <StatCard label="This Month" value={inr(d.monthlySpend)} sub="total expenses" flash={flashStats} />
        </div>

        {/* Recent expenses */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-card)", padding: "18px 22px", marginBottom: 20, boxShadow: "var(--shadow-sm)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>Recent expenses</p>
            <a href="#expenses" style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600 }}>See all →</a>
          </div>
          {d.recentExpenses.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", padding: "20px 0", textAlign: "center" }}>No expenses yet. Speak one above!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {d.recentExpenses.map((e, i) => {
                const typeColor = e.type === "Need" ? "var(--blue)" : e.type === "Want" ? "var(--orange)" : "var(--green)";
                return (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: i < d.recentExpenses.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--parchment)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0 }}>{categoryIcon(e.category)}</div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</p>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {e.category} · {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          {e.isSplit && e.amount !== expenseShare(e) ? ` · Split · paid ${inr(e.amount)}` : ""}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: "0.7rem", color: typeColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{e.type}</span>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>{inr(expenseShare(e))}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Consolidated sections */}
      <IncomeSection refreshKey={refreshKey} onChanged={refreshAll} />
      <ExpensesSection refreshKey={refreshKey} onChanged={refreshAll} />
      <SplitsSection refreshKey={refreshKey} onChanged={refreshAll} />
      <LendingSection refreshKey={refreshKey} onChanged={refreshAll} />
      <WeeklySection refreshKey={refreshKey} />
      <MonthlySection refreshKey={refreshKey} />
    </div>
  );
}
