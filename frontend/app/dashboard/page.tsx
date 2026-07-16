"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";
import { CATEGORIES, PAYMENT_MODES, INCOME_SOURCES, SAVINGS_DESTINATIONS, SAVINGS_KINDS } from "@/lib/constants";
import { computeMonthLedger, monthKeyAfter } from "@/lib/balance";
import { dateKey, expenseShare, inr, isoWeekKey, monthStr, today } from "@/lib/format";
import type { DashboardData, Expense, Flatmate, Income, Saving, Settings } from "@/lib/types";
import { PageLoading } from "@/components/ui/PageShell";
import { CreamSelect } from "@/components/ui/CreamSelect";
import { CreamDatePicker } from "@/components/ui/CreamDatePicker";
import { CreamMonthPicker } from "@/components/ui/CreamMonthPicker";
import { BentoCard, BarChart, DonutChart, PieChart, StatTile } from "@/components/dashboard/DashboardCharts";
import { DashboardHeatmap } from "@/components/dashboard/DashboardHeatmap";

type ParsedExpense = { date: string | null; description: string | null; category: string | null; amount: number | null; paymentMode: string | null; notes?: string | null };
type ParsedSplitExpense = ParsedExpense & { matchedFlatmates?: Flatmate[]; unmatchedFlatmates?: string[] };
type ParsedIncome = { date: string | null; source: string | null; amount: number | null; notes?: string | null };
type ParsedLending = { personName: string | null; amount: number | null; reason?: string | null; date: string | null };
type ParsedSaving = { kind: "invested" | "saved" | null; amount: number | null; destination?: string | null; reason?: string | null; date: string | null };
type ParsedSplitClear = { flatmateId: string | null; flatmateName: string | null; amount: number | null; reason?: string | null; date: string | null; unmatched?: boolean };
type ParsedIntent =
  | { intent: "expense"; data: ParsedExpense }
  | { intent: "split_expense"; data: ParsedSplitExpense }
  | { intent: "income"; data: ParsedIncome }
  | { intent: "lending"; data: ParsedLending }
  | { intent: "savings"; data: ParsedSaving }
  | { intent: "split_clear"; data: ParsedSplitClear };


function round2(n: number) { return Math.round(n * 100) / 100; }

const INTENT_LABELS: Record<string, string> = {
  expense: "💳 Expense Detected",
  split_expense: "🤝 Split Expense Detected",
  income: "💰 Income Detected",
  lending: "📤 Lending Detected",
  savings: "🏦 Savings / Investment Detected",
  split_clear: "✅ Split Clear Detected",
};

function BalanceCard({
  monthLabel,
  isCurrentMonth,
  liveBalance,
  monthOpening,
  monthIncome,
  monthExpenses,
  monthSavings,
  monthWithdrawals,
  monthClosing,
  prevMonthLabel,
  nextMonthLabel,
  splitsReceivable,
  splitsPayable,
  splitsNet,
  lendingDebt,
  savingsActive,
  flash,
}: {
  monthLabel: string;
  isCurrentMonth: boolean;
  liveBalance: number;
  monthOpening: number;
  monthIncome: number;
  monthExpenses: number;
  monthSavings: number;
  monthWithdrawals: number;
  monthClosing: number;
  prevMonthLabel: string | null;
  nextMonthLabel: string;
  splitsReceivable: number;
  splitsPayable: number;
  splitsNet: number;
  lendingDebt: number;
  savingsActive: number;
  flash?: boolean;
}) {
  const displayBalance = isCurrentMonth ? liveBalance : monthClosing;
  const low = displayBalance < 1000;
  return (
    <div className={`bento-balance${flash ? " animate-flash" : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
            {isCurrentMonth ? "Current balance" : "Month closing"} · {monthLabel}
          </p>
          <p
            className={`balance-amount${flash ? " animate-count-up" : ""}`}
            style={{ color: low ? "var(--red)" : "var(--text-primary)" }}
          >
            {inr(displayBalance)}
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 8, maxWidth: 480, lineHeight: 1.5 }}>
            {isCurrentMonth
              ? "This month's closing becomes next month's opening automatically."
              : `This ${inr(monthClosing)} carries to ${nextMonthLabel} as opening balance.`}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span className={`badge ${low ? "badge-red" : "badge-green"}`}>{low ? "Running low" : "On track"}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border-light)", flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {prevMonthLabel ? `Opening (from ${prevMonthLabel})` : "Opening"}
          </p>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-secondary)" }}>{inr(monthOpening)}</p>
        </div>
        <div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>+ Income</p>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--green)" }}>{inr(monthIncome)}</p>
        </div>
        <div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>− Expenses</p>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--orange)" }}>{inr(monthExpenses)}</p>
        </div>
        <div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>− Savings</p>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--blue)" }}>{inr(monthSavings)}</p>
        </div>
        {monthWithdrawals > 0 && (
          <div>
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>+ Withdrawn</p>
            <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--green)" }}>{inr(monthWithdrawals)}</p>
          </div>
        )}
        <div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Closing</p>
          <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>{inr(monthClosing)}</p>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <a href="/settings" style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600 }}>Baseline →</a>
        </div>
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-light)", flexWrap: "wrap" }}>
        <div style={{ width: "100%", marginBottom: 2 }}>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Carried forward (splits & lending — not reset each month)
          </p>
        </div>
        <div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Split receivable</p>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--green)" }}>{inr(splitsReceivable)}</p>
        </div>
        <div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Split payable</p>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--orange)" }}>{inr(splitsPayable)}</p>
        </div>
        <div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Split net</p>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: splitsNet >= 0 ? "var(--green)" : "var(--orange)" }}>
            {splitsNet >= 0 ? "+" : ""}{inr(splitsNet)}
          </p>
        </div>
        <div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Savings (active)</p>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--blue)" }}>{inr(savingsActive)}</p>
        </div>
        <div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Lending (debt)</p>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>{inr(lendingDebt)}</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <a href="/savings" style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600 }}>Savings →</a>
          <a href="/splits" style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600 }}>Splits →</a>
          <a href="/lending" style={{ fontSize: "0.78rem", color: "var(--accent)", fontWeight: 600 }}>Lending →</a>
        </div>
      </div>
    </div>
  );
}

function formatMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function ConfirmCard({
  intent, expenseForm, incomeForm, lendingForm, savingsForm, clearForm, splitFlatmateIds, splitShares, flatmates,
  onConfirm, onCancel, saving, setExpenseForm, setIncomeForm, setLendingForm, setSavingsForm, setClearForm,
  setSplitFlatmateIds, setSplitShares, unmatchedFlatmates,
}: {
  intent: string | null;
  expenseForm: { date: string; description: string; category: string; amount: string; paymentMode: string; notes: string };
  incomeForm: { date: string; source: string; amount: string; notes: string };
  lendingForm: { date: string; personName: string; amount: string; reason: string };
  savingsForm: { date: string; kind: string; amount: string; destination: string; reason: string };
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
  setSavingsForm: React.Dispatch<React.SetStateAction<typeof savingsForm>>;
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
    : intent === "savings" ? Number(savingsForm.amount || 0)
    : intent === "split_clear" ? Number(clearForm.amount || 0)
    : intent === "split_expense" ? userShare
    : Number(expenseForm.amount || 0);

  return (
    <div className="animate-fade-up" style={{ background: "var(--card)", border: "1.5px solid var(--accent)", borderRadius: "var(--radius-card)", padding: "20px 24px", boxShadow: "var(--shadow-lg)", marginTop: 12 }}>
      <div className="confirm-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>{INTENT_LABELS[intent] ?? intent}</p>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Say &quot;confirm&quot; or &quot;cancel&quot;</span>
      </div>

      {(intent === "expense" || intent === "split_expense") && (
        <>
          <div className="form-grid-2">
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
        <div className="form-grid-2">
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>AMOUNT (₹)</p><input className="cream-input" type="number" value={incomeForm.amount} onChange={e => setIncomeForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>SOURCE</p><CreamSelect value={incomeForm.source} onChange={source => setIncomeForm(f => ({ ...f, source }))} options={INCOME_SOURCES} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>DATE</p><CreamDatePicker value={incomeForm.date} onChange={date => setIncomeForm(f => ({ ...f, date }))} /></div>
        </div>
      )}

      {intent === "lending" && (
        <div className="form-grid-2">
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>PERSON</p><input className="cream-input" value={lendingForm.personName} onChange={e => setLendingForm(f => ({ ...f, personName: e.target.value }))} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>AMOUNT (₹)</p><input className="cream-input" type="number" value={lendingForm.amount} onChange={e => setLendingForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>REASON</p><input className="cream-input" value={lendingForm.reason} onChange={e => setLendingForm(f => ({ ...f, reason: e.target.value }))} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>DATE</p><CreamDatePicker value={lendingForm.date} onChange={date => setLendingForm(f => ({ ...f, date }))} /></div>
        </div>
      )}

      {intent === "savings" && (
        <div className="form-grid-2">
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>TYPE</p>
            <CreamSelect value={savingsForm.kind} onChange={kind => setSavingsForm(f => ({ ...f, kind }))} options={[{ value: "invested", label: "Invested" }, { value: "saved", label: "Saved for later" }]} />
          </div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>AMOUNT (₹)</p><input className="cream-input" type="number" value={savingsForm.amount} onChange={e => setSavingsForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>WHERE</p>
            <CreamSelect value={savingsForm.destination} onChange={destination => setSavingsForm(f => ({ ...f, destination }))} options={SAVINGS_DESTINATIONS} />
          </div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>NOTE</p><input className="cream-input" value={savingsForm.reason} onChange={e => setSavingsForm(f => ({ ...f, reason: e.target.value }))} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>DATE</p><CreamDatePicker value={savingsForm.date} onChange={date => setSavingsForm(f => ({ ...f, date }))} /></div>
        </div>
      )}

      {intent === "split_clear" && (
        <div className="form-grid-2">
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>FLATMATE</p>
            <CreamSelect value={clearForm.flatmateId} onChange={flatmateId => setClearForm(f => ({ ...f, flatmateId }))} options={flatmates.map(f => ({ value: f.id, label: f.name }))} />
          </div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>AMOUNT (₹)</p><input className="cream-input" type="number" value={clearForm.amount} onChange={e => setClearForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>REASON</p><input className="cream-input" value={clearForm.reason} onChange={e => setClearForm(f => ({ ...f, reason: e.target.value }))} /></div>
          <div><p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 3 }}>DATE</p><CreamDatePicker value={clearForm.date} onChange={date => setClearForm(f => ({ ...f, date }))} /></div>
        </div>
      )}

      <div className="confirm-actions">
        <button className="btn-ghost" onClick={onCancel} disabled={saving} style={{ flex: "0 0 auto", padding: "8px 20px" }}>Cancel</button>
        <button className="btn-accent" onClick={onConfirm} disabled={saving}>
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
  const [savingsForm, setSavingsForm] = useState<{ date: string; kind: string; amount: string; destination: string; reason: string }>({ date: today(), kind: SAVINGS_KINDS[0], amount: "", destination: SAVINGS_DESTINATIONS[0], reason: "" });
  const [clearForm, setClearForm] = useState({ date: today(), flatmateId: "", amount: "", reason: "" });
  const [splitFlatmateIds, setSplitFlatmateIds] = useState<string[]>([]);
  const [splitShares, setSplitShares] = useState<Record<string, string>>({});
  const [unmatchedFlatmates, setUnmatchedFlatmates] = useState<string[]>([]);
  const [flatmates, setFlatmates] = useState<Flatmate[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [savingsEntries, setSavingsEntries] = useState<Saving[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => monthStr(new Date()));

  const fetchDashboard = useCallback(() => {
    apiFetch<DashboardData>("/api/dashboard")
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchChartData = useCallback(() => {
    Promise.all([
      apiFetch<{ expenses: Expense[] }>("/api/expenses"),
      apiFetch<{ incomes: Income[] }>("/api/income"),
      apiFetch<{ savings: Saving[] }>("/api/savings"),
      apiFetch<{ settings: Settings }>("/api/settings").catch(() => null),
    ])
      .then(([exp, inc, sav, set]) => {
        setExpenses(exp.expenses);
        setIncomes(inc.incomes);
        setSavingsEntries(sav.savings);
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

  const isViewingCurrentMonth = selectedMonth === monthStr(new Date());
  const weeklyLimit = settings?.weeklyLimit ?? data?.weeklyLimit ?? 2500;
  const monthlyBudget = settings?.monthlyIncome ?? 0;

  const monthExpenses = useMemo(
    () => expenses.filter((e) => dateKey(e.date).slice(0, 7) === selectedMonth),
    [expenses, selectedMonth],
  );

  const monthIncomes = useMemo(
    () => incomes.filter((i) => dateKey(i.date).slice(0, 7) === selectedMonth),
    [incomes, selectedMonth],
  );

  const monthSpend = useMemo(
    () => monthExpenses.reduce((s, e) => s + expenseShare(e), 0),
    [monthExpenses],
  );

  const monthIncomeTotal = useMemo(
    () => monthIncomes.reduce((s, i) => s + i.amount, 0),
    [monthIncomes],
  );

  const monthInvested = useMemo(
    () =>
      savingsEntries
        .filter((s) => dateKey(s.date).slice(0, 7) === selectedMonth && s.kind === "invested")
        .reduce((sum, s) => sum + s.amount, 0),
    [savingsEntries, selectedMonth],
  );

  const monthSaved = useMemo(
    () =>
      savingsEntries
        .filter((s) => dateKey(s.date).slice(0, 7) === selectedMonth && s.kind === "saved")
        .reduce((sum, s) => sum + s.amount, 0),
    [savingsEntries, selectedMonth],
  );

  const monthSavingsTotal = monthInvested + monthSaved;

  const monthTypeSplit = useMemo(() => {
    const split = { Need: 0, Want: 0 };
    for (const e of monthExpenses) {
      if (e.type === "Need") split.Need += expenseShare(e);
      else split.Want += expenseShare(e);
    }
    return split;
  }, [monthExpenses]);

  const categorySegments = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of monthExpenses) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + expenseShare(e));
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
  }, [monthExpenses]);

  const weeklyBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of monthExpenses) {
      const k = isoWeekKey(e.date);
      map.set(k, (map.get(k) ?? 0) + expenseShare(e));
    }
    const currentKey = isViewingCurrentMonth ? isoWeekKey(today()) : "";
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => ({
        label: key.split("-W")[1] ? `W${key.split("-W")[1]}` : key,
        value,
        highlight: key === currentKey,
      }));
  }, [monthExpenses, isViewingCurrentMonth]);

  const monthBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const k = dateKey(e.date).slice(0, 7);
      map.set(k, (map.get(k) ?? 0) + expenseShare(e));
    }
    const [year, month] = selectedMonth.split("-").map(Number);
    const items = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const k = monthStr(d);
      items.push({
        label: d.toLocaleDateString("en-IN", { month: "short" }),
        value: map.get(k) ?? 0,
        highlight: k === selectedMonth,
      });
    }
    return items;
  }, [expenses, selectedMonth]);

  const recentThree = useMemo(
    () =>
      [...monthExpenses]
        .sort((a, b) => dateKey(b.date).localeCompare(dateKey(a.date)))
        .slice(0, 3),
    [monthExpenses],
  );

  const daysWithSpend = useMemo(() => {
    const days = new Set(
      monthExpenses.filter((e) => expenseShare(e) > 0).map((e) => dateKey(e.date)),
    );
    return days.size;
  }, [monthExpenses]);

  const avgDailySpend = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const divisor = isViewingCurrentMonth ? Math.max(1, new Date().getDate()) : daysInMonth;
    return monthSpend / divisor;
  }, [monthSpend, selectedMonth, isViewingCurrentMonth]);

  const dayThreshold = weeklyLimit / 7 || 1;

  const monthLedger = useMemo(
    () =>
      computeMonthLedger(
        selectedMonth,
        settings?.startingBalance ?? data?.startingBalance ?? 0,
        incomes,
        expenses,
        savingsEntries.map((s) => ({
          date: dateKey(s.date),
          amount: s.amount,
          status: s.status,
          withdrawnAt: s.withdrawnAt ? dateKey(String(s.withdrawnAt)) : null,
        })),
      ),
    [selectedMonth, settings?.startingBalance, data?.startingBalance, incomes, expenses, savingsEntries],
  );

  const prevMonthLabel = monthLedger.prevMonthKey ? formatMonthLabel(monthLedger.prevMonthKey) : null;
  const nextMonthLabel = formatMonthLabel(monthKeyAfter(selectedMonth));

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
      } else if (res.intent === "savings") {
        const p = res.data;
        setSavingsForm({
          date: p.date || today(),
          kind: p.kind === "saved" ? "saved" : "invested",
          amount: p.amount != null ? String(p.amount) : "",
          destination: p.destination && SAVINGS_DESTINATIONS.includes(p.destination as typeof SAVINGS_DESTINATIONS[number]) ? p.destination : SAVINGS_DESTINATIONS[0],
          reason: p.reason || "",
        });
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
      } else if (intentData.intent === "savings") {
        await apiFetch("/api/savings", {
          method: "POST",
          body: JSON.stringify({
            date: savingsForm.date || today(),
            kind: savingsForm.kind,
            amount: Number(savingsForm.amount),
            destination: savingsForm.destination,
            reason: savingsForm.reason,
          }),
        });
        setSuccessMsg(`✓ Savings logged — ${inr(Number(savingsForm.amount))}`);
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
  }, [intentData, expenseForm, incomeForm, lendingForm, savingsForm, clearForm, splitFlatmateIds, splitShares, unmatchedFlatmates, refreshAll]);

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
  const weeklyPct = isViewingCurrentMonth && d.weeklyLimit > 0 ? Math.min(100, (d.weeklySpend / d.weeklyLimit) * 100) : 0;
  const weeklyOver = isViewingCurrentMonth && d.weeklySpend > d.weeklyLimit;
  const coinPositive = d.coinBalance >= 0;

  const weeklyRemaining = isViewingCurrentMonth ? Math.max(0, d.weeklyLimit - d.weeklySpend) : 0;
  const monthBudgetPct = monthlyBudget > 0 ? Math.min(100, (monthSpend / monthlyBudget) * 100) : 0;
  const monthBudgetOver = monthlyBudget > 0 && monthSpend > monthlyBudget;
  const monthLabel = formatMonthLabel(selectedMonth);

  const typeSegments = [
    { label: "Need", value: monthTypeSplit.Need, color: "var(--blue)" },
    { label: "Want", value: monthTypeSplit.Want, color: "var(--orange)" },
    ...(monthInvested > 0 ? [{ label: "Invested", value: monthInvested, color: "var(--green)" }] : []),
    ...(monthSaved > 0 ? [{ label: "Saved", value: monthSaved, color: "var(--accent)" }] : []),
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-head">
        <div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>Dashboard</p>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", margin: "4px 0 0" }}>
            Welcome back, {user.name.split(" ")[0]} 👋
          </h1>
        </div>
        <div className="dashboard-head-actions">
          <div className="dashboard-month-picker">
            <p style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>View month</p>
            <CreamMonthPicker value={selectedMonth} onChange={setSelectedMonth} monthsBack={36} />
          </div>
          <div className="badge badge-coin" style={{ padding: "6px 14px", fontSize: "0.85rem", alignSelf: "flex-end" }} title={coinPositive ? "Learning is outpacing want spending" : "Spending more wants than learning"}>
            🪙 {d.coinBalance} coins
          </div>
        </div>
      </div>

      <div className="dashboard-bento">
        <div className="bento-span-4">
          <BalanceCard
            monthLabel={monthLabel}
            isCurrentMonth={isViewingCurrentMonth}
            liveBalance={d.currentBalance ?? 0}
            monthOpening={monthLedger.opening}
            monthIncome={monthLedger.income}
            monthExpenses={monthLedger.expenses}
            monthSavings={monthLedger.savings}
            monthWithdrawals={monthLedger.withdrawals}
            monthClosing={monthLedger.closing}
            prevMonthLabel={prevMonthLabel}
            nextMonthLabel={nextMonthLabel}
            splitsReceivable={d.splitsReceivable ?? 0}
            splitsPayable={d.splitsPayable ?? 0}
            splitsNet={d.splitsNetTotal ?? 0}
            lendingDebt={d.lendingSummary?.totalPending ?? 0}
            savingsActive={d.savingsSummary?.totalActive ?? 0}
            flash={flashStats}
          />
        </div>

        <div className="bento-span-4 bento-voice">
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            🤖 Voice logger
          </p>
          <div className="voice-logger-row">
            <button className={`mic-btn${listening ? " active" : ""}`} onClick={toggleMic} title={listening ? "Stop" : "Speak"}>🎤</button>
            <input
              className="cream-input"
              value={interim || agentText}
              onChange={e => setAgentText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && agentText.trim()) sendForParse(agentText); }}
              placeholder={listening ? "Listening..." : "Try: 'Wifi 430 split with Rahul' · 'Invested 5000 in SIP' · 'Lent Rahul 500'"}
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
            savingsForm={savingsForm}
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
            setSavingsForm={setSavingsForm}
            setClearForm={setClearForm}
            setSplitFlatmateIds={setSplitFlatmateIds}
            setSplitShares={setSplitShares}
          />
        </div>

        {isViewingCurrentMonth ? (
          <>
            <StatTile label="Today" value={inr(d.todaySpend)} sub="expenses" flash={flashStats} />
            <StatTile label="This week" value={inr(d.weeklySpend)} sub={`${Math.round(weeklyPct)}% of limit`} flash={flashStats} />
            <StatTile label={monthLabel} value={inr(monthSpend)} sub={monthSavingsTotal > 0 ? `${inr(monthSavingsTotal)} to savings` : "expenses"} flash={flashStats} />
          </>
        ) : (
          <>
            <StatTile label={monthLabel} value={inr(monthSpend)} sub="expenses" flash={flashStats} />
            <StatTile label="Savings" value={inr(monthSavingsTotal)} sub={monthInvested > 0 && monthSaved > 0 ? `${inr(monthInvested)} invested · ${inr(monthSaved)} saved` : monthInvested > 0 ? "invested" : monthSaved > 0 ? "saved for later" : "none logged"} flash={flashStats} />
            <StatTile label="Income" value={inr(monthIncomeTotal)} sub="logged this month" flash={flashStats} />
          </>
        )}

        <BentoCard
          title={isViewingCurrentMonth ? "Weekly budget" : "Monthly budget"}
          subtitle={isViewingCurrentMonth ? `Limit ${inr(d.weeklyLimit)}` : monthlyBudget > 0 ? `Budget ${inr(monthlyBudget)}` : monthLabel}
          span={1}
        >
          {isViewingCurrentMonth ? (
            <DonutChart
              size={108}
              centerValue={`${Math.round(weeklyPct)}%`}
              centerLabel={weeklyOver ? "over" : "used"}
              segments={[
                { label: "Spent", value: d.weeklySpend, color: weeklyOver ? "var(--red)" : "var(--orange)" },
                { label: "Left", value: weeklyRemaining, color: "var(--green)" },
              ]}
            />
          ) : monthlyBudget > 0 ? (
            <DonutChart
              size={108}
              centerValue={`${Math.round(monthBudgetPct)}%`}
              centerLabel={monthBudgetOver ? "over" : "used"}
              segments={[
                { label: "Spent", value: monthSpend, color: monthBudgetOver ? "var(--red)" : "var(--orange)" },
                { label: "Left", value: Math.max(0, monthlyBudget - monthSpend), color: "var(--green)" },
              ]}
            />
          ) : (
            <DonutChart
              size={108}
              centerValue={inr(monthSpend)}
              centerLabel="spent"
              segments={categorySegments.length > 0 ? categorySegments.slice(0, 5) : [{ label: "Spend", value: monthSpend || 1 }]}
            />
          )}
        </BentoCard>

        <BentoCard title="Spend by category" subtitle={monthLabel} span={2} href="/expenses">
          <DonutChart segments={categorySegments} size={110} centerValue={inr(monthSpend)} centerLabel="total" />
        </BentoCard>

        <BentoCard title="Need / Want / Savings" subtitle={`${monthLabel} · savings from /savings`} span={1} href="/savings">
          <PieChart segments={typeSegments.length > 0 ? typeSegments : [{ label: "No data", value: 1, color: "var(--border-light)" }]} size={88} />
        </BentoCard>

        <BentoCard title="Recent" subtitle={`${monthLabel} · latest 3`} span={1} href="/expenses">
          {recentThree.length === 0 ? (
            <p className="chart-empty-text">No expenses in {monthLabel}.</p>
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

        <BentoCard title="Weekly breakdown" subtitle={`${monthLabel} · by ISO week`} span={2} href="/weekly">
          <BarChart items={weeklyBars} limit={isViewingCurrentMonth ? weeklyLimit : undefined} />
        </BentoCard>

        <BentoCard title="Monthly trend" subtitle="6 months ending selected" span={2} href="/monthly">
          <BarChart items={monthBars} />
        </BentoCard>

        <BentoCard title="Spending heatmap" subtitle={`${selectedMonth.slice(0, 4)} · daily intensity`} span={4}>
          <DashboardHeatmap expenses={expenses} dayThreshold={dayThreshold} highlightMonth={selectedMonth} />
        </BentoCard>
      </div>
    </div>
  );
}
