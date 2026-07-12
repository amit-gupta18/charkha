"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";
import { CATEGORIES, PAYMENT_MODES, INCOME_SOURCES } from "@/lib/constants";
import { dateKey, inr, isoWeekKey, today, expenseShare } from "@/lib/format";
import type { DashboardData, Expense, Flatmate, Settings } from "@/lib/types";
import { PageLoading } from "@/components/ui/PageShell";
import { CreamSelect } from "@/components/ui/CreamSelect";
import { CreamDatePicker } from "@/components/ui/CreamDatePicker";
import { BentoCard, BarChart, DonutChart, PieChart, StatTile } from "@/components/dashboard/DashboardCharts";
import { DashboardHeatmap } from "@/components/dashboard/DashboardHeatmap";

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
    <div className={`bento-balance${flash ? " animate-flash" : ""}`}>
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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const fetchDashboard = useCallback(() => {
    apiFetch<DashboardData>("/api/dashboard")
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchChartData = useCallback(() => {
    Promise.all([
      apiFetch<{ expenses: Expense[] }>("/api/expenses"),
      apiFetch<{ settings: Settings }>("/api/settings").catch(() => null),
    ])
      .then(([exp, set]) => {
        setExpenses(exp.expenses);
        setSettings(set?.settings ?? null);
      })
      .catch(() => {});
  }, []);

  const refreshAll = useCallback(() => {
    fetchDashboard();
    fetchChartData();
    setRefreshKey(k => k + 1);
  }, [fetchDashboard, fetchChartData]);

  useEffect(() => {
    if (!authLoading) {
      fetchDashboard();
      fetchChartData();
      apiFetch<{ flatmates: Flatmate[] }>("/api/flatmates").then(r => setFlatmates(r.flatmates)).catch(() => {});
    }
  }, [authLoading, fetchDashboard, fetchChartData, refreshKey]);

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const weeklyLimit = settings?.weeklyLimit ?? data?.weeklyLimit ?? 2500;

  const categorySegments = useMemo(() => {
    const monthExpenses = expenses.filter((e) => dateKey(e.date).slice(0, 7) === currentMonthKey);
    const totals = new Map<string, number>();
    for (const e of monthExpenses) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + expenseShare(e));
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
  }, [expenses, currentMonthKey]);

  const weeklyBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const k = isoWeekKey(e.date);
      map.set(k, (map.get(k) ?? 0) + expenseShare(e));
    }
    const currentKey = isoWeekKey(today());
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 8)
      .reverse()
      .map(([key, value]) => ({
        label: key.split("-W")[1] ? `W${key.split("-W")[1]}` : key,
        value,
        highlight: key === currentKey,
      }));
  }, [expenses]);

  const monthBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const k = dateKey(e.date).slice(0, 7);
      map.set(k, (map.get(k) ?? 0) + expenseShare(e));
    }
    const now = new Date();
    const items = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      items.push({
        label: d.toLocaleDateString("en-IN", { month: "short" }),
        value: map.get(k) ?? 0,
        highlight: k === currentMonthKey,
      });
    }
    return items;
  }, [expenses, currentMonthKey]);

  const dayThreshold = weeklyLimit / 7 || 1;

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
  const weeklyOver = d.weeklySpend > d.weeklyLimit;
  const coinPositive = d.coinBalance >= 0;

  const weeklyRemaining = Math.max(0, d.weeklyLimit - d.weeklySpend);
  const recentThree = d.recentExpenses.slice(0, 3);
  const typeSegments = [
    { label: "Need", value: d.typeSplit.Need, color: "var(--blue)" },
    { label: "Want", value: d.typeSplit.Want, color: "var(--orange)" },
    { label: "Saving", value: d.typeSplit.Saving, color: "var(--green)" },
  ];

  return (
    <div className="dashboard-page">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Dashboard</p>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", margin: "4px 0 0" }}>
            Welcome back, {user.name.split(" ")[0]} 👋
          </h1>
        </div>
        <div className="badge badge-coin" style={{ padding: "6px 14px", fontSize: "0.85rem" }} title={coinPositive ? "Learning is outpacing want spending" : "Spending more wants than learning"}>
          🪙 {d.coinBalance} coins
        </div>
      </div>

      <div className="dashboard-bento">
        <div className="bento-span-4">
          <BalanceCard
            balance={d.currentBalance ?? 0}
            startingBalance={d.startingBalance ?? 0}
            totalIncome={d.totalIncome ?? 0}
            totalExpenses={d.totalExpenses ?? 0}
            flash={flashStats}
          />
        </div>

        <div className="bento-span-4 bento-voice">
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            🤖 Voice logger
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className={`mic-btn${listening ? " active" : ""}`} onClick={toggleMic} title={listening ? "Stop" : "Speak"}>🎤</button>
            <input
              className="cream-input"
              value={interim || agentText}
              onChange={e => setAgentText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && agentText.trim()) sendForParse(agentText); }}
              placeholder={listening ? "Listening..." : "Try: 'Wifi 430 split with Rahul UPI' or 'Lent Rahul 500 for dinner'"}
              style={{ flex: 1 }}
            />
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

        <StatTile label="Today" value={inr(d.todaySpend)} sub="logged today" flash={flashStats} />
        <StatTile label="This week" value={inr(d.weeklySpend)} sub={`${Math.round(weeklyPct)}% of limit`} flash={flashStats} />
        <StatTile label="This month" value={inr(d.monthlySpend)} sub="your spend" flash={flashStats} />

        <BentoCard title="Weekly budget" subtitle={`Limit ${inr(d.weeklyLimit)}`} span={1}>
          <DonutChart
            size={108}
            centerValue={`${Math.round(weeklyPct)}%`}
            centerLabel={weeklyOver ? "over" : "used"}
            segments={[
              { label: "Spent", value: d.weeklySpend, color: weeklyOver ? "var(--red)" : "var(--orange)" },
              { label: "Left", value: weeklyRemaining, color: "var(--green)" },
            ]}
          />
        </BentoCard>

        <BentoCard title="Spend by category" subtitle="This month" span={2} href="/expenses">
          <DonutChart segments={categorySegments} size={110} centerValue={inr(d.monthlySpend)} centerLabel="total" />
        </BentoCard>

        <BentoCard title="Need / Want / Saving" subtitle="This month" span={1} href="/monthly">
          <PieChart segments={typeSegments} size={88} />
        </BentoCard>

        <BentoCard title="Recent" subtitle="Latest 3" span={1} href="/expenses">
          {recentThree.length === 0 ? (
            <p className="chart-empty-text">No expenses yet. Speak one above!</p>
          ) : (
            <div className="recent-list">
              {recentThree.map((e) => (
                <div key={e.id} className="recent-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                    <div className="recent-icon">{categoryIcon(e.category)}</div>
                    <div className="recent-meta">
                      <p className="recent-title">{e.description}</p>
                      <p className="recent-sub">
                        {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        {e.isSplit && e.amount !== expenseShare(e) ? ` · paid ${inr(e.amount)}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="recent-amt">{inr(expenseShare(e))}</span>
                </div>
              ))}
            </div>
          )}
        </BentoCard>

        <BentoCard title="Weekly analysis" subtitle="Last 8 weeks · orange line = limit" span={2} href="/weekly">
          <BarChart items={weeklyBars} limit={weeklyLimit} />
        </BentoCard>

        <BentoCard title="Monthly report" subtitle="Last 6 months" span={2} href="/monthly">
          <BarChart items={monthBars} />
        </BentoCard>

        <BentoCard title="Spending heatmap" subtitle={`${new Date().getFullYear()} · daily intensity`} span={4}>
          <DashboardHeatmap expenses={expenses} dayThreshold={dayThreshold} />
        </BentoCard>
      </div>
    </div>
  );
}
