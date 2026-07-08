"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Settings } from "@/lib/types";

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<{ settings: Settings }>("/api/settings")
      .then((data) => setSettings(data.settings))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Center>Loading settings...</Center>;

  function update(patch: Partial<Settings>) {
    if (settings) setSettings({ ...settings, ...patch });
    setSaved(false);
  }

  async function save() {
    if (!settings) return;
    const total = settings.needsPct + settings.wantsPct + settings.savingsPct;
    if (Math.abs(total - 1) > 0.01) {
      setError(`Need + Want + Saving must sum to 1 (currently ${total.toFixed(2)}).`);
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch<Settings>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save settings (backend may not support PUT yet).");
    } finally {
      setSaving(false);
    }
  }

  const s = settings!;
  const total = s.needsPct + s.wantsPct + s.savingsPct;

  return (
    <main className="px-6 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        {saved && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">Settings saved.</div>}

        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <NumField label="Monthly Income (₹)" value={s.monthlyIncome} onChange={(v) => update({ monthlyIncome: v })} />
          <NumField label="Weekly Limit (₹)" value={s.weeklyLimit} onChange={(v) => update({ weeklyLimit: v })} />
          <div className="border-t border-white/10 pt-4">
            <p className="mb-2 text-sm text-zinc-300">Budget split (must total 1.0)</p>
            <div className="grid grid-cols-3 gap-3">
              <PctField label="Need %" value={s.needsPct} onChange={(v) => update({ needsPct: v })} />
              <PctField label="Want %" value={s.wantsPct} onChange={(v) => update({ wantsPct: v })} />
              <PctField label="Saving %" value={s.savingsPct} onChange={(v) => update({ savingsPct: v })} />
            </div>
            <p className={`mt-2 text-xs ${Math.abs(total - 1) > 0.01 ? "text-red-300" : "text-emerald-300"}`}>
              Total: {total.toFixed(2)}
            </p>
          </div>
          <button className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60"
            onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </main>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-zinc-300">{label}</span>
      <input className="input" type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
function PctField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-zinc-400">{label}</span>
      <input className="input" type="number" step="0.01" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
function Center({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center px-6 text-sm text-zinc-300">{children}</main>;
}
