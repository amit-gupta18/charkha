"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { CATEGORIES, PAYMENT_MODES } from "@/lib/constants";

type ParsedExpense = {
  date: string | null;
  description: string | null;
  category: string | null;
  amount: number | null;
  paymentMode: string | null;
  notes?: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);
const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function LogPage() {
  const router = useRouter();
  const [manual, setManual] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [form, setForm] = useState<{ date: string; description: string; category: string; amount: string; paymentMode: string; notes: string }>({
    date: today(),
    description: "",
    category: CATEGORIES[0],
    amount: "",
    paymentMode: PAYMENT_MODES[0],
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
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
        setFinalText((prev) => (prev ? prev + " " : "") + finalStr);
        sendForParse(finalStr);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
  }, []);

  const sendForParse = useCallback(async (text: string) => {
    setError(null);
    try {
      const res = await apiFetch<ParsedExpense>("/api/parse", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      const p = res;
      setParsed(p);
      setForm({
        date: p.date || today(),
        description: p.description || "",
        category: CATEGORIES.includes(p.category as any) ? (p.category as string) : CATEGORIES[0],
        amount: p.amount != null ? String(p.amount) : "",
        paymentMode: PAYMENT_MODES.includes(p.paymentMode as any) ? (p.paymentMode as string) : PAYMENT_MODES[0],
        notes: p.notes || "",
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not parse. Fill manually.");
    }
  }, []);

  function startListening() {
    setInterim("");
    setError(null);
    try {
      recognitionRef.current?.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function submit() {
    const amountNum = Number(form.amount);
    if (!form.description || !Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Description and a valid amount are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          date: form.date || today(),
          description: form.description,
          category: form.category,
          amount: amountNum,
          paymentMode: form.paymentMode,
          notes: form.notes || undefined,
        }),
      });
      setSuccess(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 600);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_32%),linear-gradient(180deg,_#09090b_0%,_#111827_100%)] px-6 py-8">
      <section className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Log an Expense</h1>
          <button
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
            onClick={() => {
              setManual((m) => !m);
              setParsed(null);
              setFinalText("");
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
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
            <button
              className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-2xl transition ${
                listening ? "bg-red-500/80 text-white" : "bg-cyan-400/20 text-cyan-200 hover:bg-cyan-400/30"
              }`}
              onClick={listening ? stopListening : startListening}
              disabled={!voiceSupported}
            >
              {listening ? "■" : "🎤"}
            </button>
            <p className="mt-4 text-sm text-zinc-300">
              {listening ? "Listening..." : voiceSupported ? "Tap and speak your expense" : "Voice unavailable"}
            </p>
            {interim && <p className="mt-2 text-sm text-cyan-200">{interim}</p>}
            {finalText && <p className="mt-2 text-xs text-zinc-400">{finalText}</p>}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Saved! Redirecting to dashboard...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        )}

        {(manual || parsed || form.description) && (
          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-semibold text-white">Confirm details</h2>
            <Field label="Description">
              <input
                className="input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Lunch at cafe"
              />
            </Field>
            <Field label="Amount (₹)">
              <input
                className="input"
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Payment Mode">
                <select className="input" value={form.paymentMode} onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}>
                  {PAYMENT_MODES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Date">
              <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Notes">
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <button
              className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:opacity-60"
              onClick={submit}
              disabled={saving}
            >
              {saving ? "Saving..." : `Save Expense ${form.amount ? inr(Number(form.amount)) : ""}`}
            </button>
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
