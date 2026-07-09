"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { CATEGORIES, PAYMENT_MODES, INCOME_SOURCES } from "@/lib/constants";

type ParsedExpense = {
  date: string | null;
  description: string | null;
  category: string | null;
  amount: number | null;
  paymentMode: string | null;
  notes?: string | null;
};

type ParsedIncome = {
  date: string | null;
  source: string | null;
  amount: number | null;
  notes?: string | null;
};

type ParsedIntent =
  | { intent: "expense"; data: ParsedExpense }
  | { intent: "income"; data: ParsedIncome };

type AppState = "IDLE" | "PARSING" | "PENDING_CONFIRMATION" | "SAVING";

const today = () => new Date().toISOString().slice(0, 10);
const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function LogPage() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState>("IDLE");
  const [manual, setManual] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const [intentData, setIntentData] = useState<ParsedIntent | null>(null);

  const [expenseForm, setExpenseForm] = useState<{ date: string; description: string; category: string; amount: string; paymentMode: string; notes: string }>({
    date: today(), description: "", category: CATEGORIES[0], amount: "", paymentMode: PAYMENT_MODES[0], notes: "",
  });

  const [incomeForm, setIncomeForm] = useState<{ date: string; source: string; amount: string; notes: string }>({
    date: today(), source: INCOME_SOURCES[0], amount: "", notes: "",
  });

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appStateRef = useRef(appState);
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  const submitExpense = useCallback(async () => {
    const amountNum = Number(expenseForm.amount);
    if (!expenseForm.description || !Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Description and a valid amount are required.");
      return;
    }
    setAppState("SAVING");
    setError(null);
    try {
      await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          date: expenseForm.date || today(),
          description: expenseForm.description,
          category: expenseForm.category,
          amount: amountNum,
          paymentMode: expenseForm.paymentMode,
          notes: expenseForm.notes || undefined,
        }),
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save expense.");
      setAppState("PENDING_CONFIRMATION");
    }
  }, [expenseForm, router]);

  const submitIncome = useCallback(async () => {
    const amountNum = Number(incomeForm.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("A valid amount is required.");
      return;
    }
    setAppState("SAVING");
    setError(null);
    try {
      await apiFetch("/api/income", {
        method: "POST",
        body: JSON.stringify({
          date: incomeForm.date || today(),
          source: incomeForm.source,
          amount: amountNum,
          notes: incomeForm.notes || undefined,
        }),
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save income.");
      setAppState("PENDING_CONFIRMATION");
    }
  }, [incomeForm, router]);

  const cancelConfirmation = useCallback(() => {
    setIntentData(null);
    setAppState("IDLE");
    setFinalText("");
    setError("Cancelled. Say another log.");
    setTimeout(() => setError(null), 3000);
  }, []);

  const sendForParse = useCallback(async (text: string) => {
    setError(null);
    setAppState("PARSING");
    try {
      const res = await apiFetch<ParsedIntent>("/api/parse", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setIntentData(res);
      if (res.intent === "expense") {
        const p = res.data;
        setExpenseForm({
          date: p.date || today(),
          description: p.description || "",
          category: CATEGORIES.includes(p.category as any) ? (p.category as string) : CATEGORIES[0],
          amount: p.amount != null ? String(p.amount) : "",
          paymentMode: PAYMENT_MODES.includes(p.paymentMode as any) ? (p.paymentMode as string) : PAYMENT_MODES[0],
          notes: p.notes || "",
        });
      } else {
        const p = res.data;
        setIncomeForm({
          date: p.date || today(),
          source: INCOME_SOURCES.includes(p.source as any) ? (p.source as string) : INCOME_SOURCES[0],
          amount: p.amount != null ? String(p.amount) : "",
          notes: p.notes || "",
        });
      }
      setAppState("PENDING_CONFIRMATION");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not parse. Fill manually.");
      setAppState("IDLE");
    }
  }, []);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";
    
    rec.onresult = (event: any) => {
      let interimStr = "";
      let finalStr = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalStr += t;
        else interimStr += t;
      }
      setInterim(interimStr);
      
      if (finalStr) {
        const text = finalStr.trim().toLowerCase();
        const currentAppState = appStateRef.current;
        
        if (currentAppState === "PENDING_CONFIRMATION") {
          if (text.includes("confirm") || text.includes("okay") || text.includes("yes") || text.includes("ok")) {
            setIntentData(prev => {
              if (prev?.intent === "expense") submitExpense();
              if (prev?.intent === "income") submitIncome();
              return prev;
            });
          } else if (text.includes("cancel") || text.includes("no") || text.includes("stop")) {
            cancelConfirmation();
          } else {
            setFinalText((prev) => (prev ? prev + " " : "") + finalStr + " (Say 'confirm' or 'cancel')");
          }
        } else if (currentAppState === "IDLE") {
          setFinalText((prev) => (prev ? prev + " " : "") + finalStr);
          sendForParse(finalStr);
        }
      }
    };
    
    rec.onend = () => {
      // Auto-restart if we didn't manually stop
      if (listening) {
        try { rec.start(); } catch {}
      } else {
        setListening(false);
      }
    };
    rec.onerror = () => {
      // Restart on non-fatal errors
      if (listening) {
        setTimeout(() => { try { rec.start(); } catch {} }, 1000);
      }
    };
    recognitionRef.current = rec;
  }, [listening, sendForParse, submitExpense, submitIncome, cancelConfirmation]);

  function startListening() {
    setInterim("");
    setError(null);
    setListening(true);
    try { recognitionRef.current?.start(); } catch {}
  }

  function stopListening() {
    setListening(false);
    try { recognitionRef.current?.stop(); } catch {}
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_32%),linear-gradient(180deg,_#09090b_0%,_#111827_100%)] px-6 py-8">
      <section className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Hands-Free Agent</h1>
          <button
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
            onClick={() => {
              setManual((m) => !m);
              setIntentData(null);
              setAppState("IDLE");
              setFinalText("");
              if (!manual) stopListening();
            }}
          >
            {manual ? "Use voice" : "Type manually"}
          </button>
        </div>

        {!voiceSupported && !manual && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Voice not supported in this browser — use manual entry.
          </div>
        )}

        {!manual && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-lg">
            <button
              className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-2xl transition ${
                listening 
                  ? appState === "PENDING_CONFIRMATION" 
                    ? "bg-amber-500/80 text-white animate-pulse" 
                    : "bg-red-500/80 text-white animate-pulse" 
                  : "bg-cyan-400/20 text-cyan-200 hover:bg-cyan-400/30"
              }`}
              onClick={listening ? stopListening : startListening}
              disabled={!voiceSupported}
            >
              {listening ? (appState === "PENDING_CONFIRMATION" ? "🤔" : "■") : "🎤"}
            </button>
            <p className="mt-4 text-sm font-medium text-zinc-200">
              {listening 
                ? appState === "IDLE" ? "Listening continuously... speak your log."
                : appState === "PARSING" ? "Agent is thinking..."
                : appState === "PENDING_CONFIRMATION" ? "Please say 'Confirm' or 'Cancel'."
                : appState === "SAVING" ? "Saving..."
                : ""
                : voiceSupported ? "Tap microphone to start hands-free agent" : "Voice unavailable"}
            </p>
            {interim && <p className="mt-2 text-sm text-cyan-200">{interim}</p>}
            {finalText && <p className="mt-2 text-xs text-zinc-400 italic">"{finalText}"</p>}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Saved successfully! Redirecting...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        )}

        {(manual || intentData?.intent === "expense") && (
          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white">Expense Details</h2>
            <Field label="Description">
              <input className="input" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="e.g. Lunch at cafe" />
            </Field>
            <Field label="Amount (₹)">
              <input className="input" type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="0" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <select className="input" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Payment Mode">
                <select className="input" value={expenseForm.paymentMode} onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}>
                  {PAYMENT_MODES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Date">
              <input className="input" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} />
            </Field>
            <Field label="Notes">
              <textarea className="input" rows={2} value={expenseForm.notes} onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })} />
            </Field>
            <div className="flex gap-4">
              {!manual && (
                 <button className="w-1/3 rounded-2xl bg-zinc-800 px-4 py-3 font-semibold text-white hover:bg-zinc-700" onClick={cancelConfirmation} disabled={appState === "SAVING"}>Cancel</button>
              )}
              <button
                className={`flex-1 rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:opacity-60`}
                onClick={submitExpense}
                disabled={appState === "SAVING"}
              >
                {appState === "SAVING" ? "Saving..." : `Save Expense ${expenseForm.amount ? inr(Number(expenseForm.amount)) : ""}`}
              </button>
            </div>
          </div>
        )}

        {(manual || intentData?.intent === "income") && (
          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white">Income Details</h2>
            <Field label="Amount (₹)">
              <input className="input" type="number" value={incomeForm.amount} onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Source">
              <select className="input" value={incomeForm.source} onChange={(e) => setIncomeForm({ ...incomeForm, source: e.target.value })}>
                {INCOME_SOURCES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Date">
              <input className="input" type="date" value={incomeForm.date} onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })} />
            </Field>
            <Field label="Notes">
              <textarea className="input" rows={2} value={incomeForm.notes} onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })} />
            </Field>
            <div className="flex gap-4">
              {!manual && (
                 <button className="w-1/3 rounded-2xl bg-zinc-800 px-4 py-3 font-semibold text-white hover:bg-zinc-700" onClick={cancelConfirmation} disabled={appState === "SAVING"}>Cancel</button>
              )}
              <button
                className={`flex-1 rounded-2xl bg-green-400 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-green-300 disabled:opacity-60`}
                onClick={submitIncome}
                disabled={appState === "SAVING"}
              >
                {appState === "SAVING" ? "Saving..." : `Save Income ${incomeForm.amount ? inr(Number(incomeForm.amount)) : ""}`}
              </button>
            </div>
          </div>
        )}
      </section>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          padding: 0.6rem 0.9rem;
          color: #fff;
          font-size: 0.9rem;
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgba(56, 189, 248, 0.6);
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-zinc-300">{label}</span>
      {children}
    </label>
  );
}
