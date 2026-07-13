"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { inr } from "@/lib/format";
import type { Settings } from "@/lib/types";
import { Alert, FieldLabel, PageCard, PageLoading, PageShell } from "@/components/ui/PageShell";

const DEFAULTS: Settings = {
  monthlyIncome: 10000,
  weeklyLimit: 2500,
  needsPct: 0.5,
  wantsPct: 0.3,
  savingsPct: 0.2,
  startingBalance: 0,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<{ settings: Settings }>("/api/settings")
      .then((data) => setSettings(data.settings))
      .catch(() => setSettings(DEFAULTS))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading message="Loading settings..." />;

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
      const res = await apiFetch<{ settings: Settings }>("/api/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSettings(res.settings);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  const s = settings!;
  const total = s.needsPct + s.wantsPct + s.savingsPct;
  const totalOk = Math.abs(total - 1) <= 0.01;

  return (
    <PageShell title="Settings" subtitle="Budget & limits">
      {error && <Alert type="error">{error}</Alert>}
      {saved && <Alert type="success">Settings saved.</Alert>}

      <PageCard>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.5 }}>
          Configure your monthly allowance ({inr(10000)} default from home), weekly spending limit, and Need/Want/Saving budget split per Warikoo framework.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <NumField label="Starting Balance (₹)" value={s.startingBalance ?? 0} onChange={(v) => update({ startingBalance: v })} hint="Your bank balance when you first started tracking. Each new month opens with the previous month's closing balance." />
          <NumField label="Monthly Income (₹)" value={s.monthlyIncome} onChange={(v) => update({ monthlyIncome: v })} hint="Base allowance — freelance income logged separately" />
          <NumField label="Weekly Limit (₹)" value={s.weeklyLimit} onChange={(v) => update({ weeklyLimit: v })} hint="Max spend per week before going over budget" />

          <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16 }}>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>Budget split (must total 1.0)</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <PctField label="Need" value={s.needsPct} onChange={(v) => update({ needsPct: v })} />
              <PctField label="Want" value={s.wantsPct} onChange={(v) => update({ wantsPct: v })} />
              <PctField label="Saving target" value={s.savingsPct} onChange={(v) => update({ savingsPct: v })} />
            </div>
            <p style={{ marginTop: 8, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Budget target only — log actual investments & savings on the{" "}
              <a href="/savings" style={{ color: "var(--accent)", fontWeight: 600 }}>Savings</a> page.
            </p>
            <p style={{ marginTop: 8, fontSize: "0.78rem", color: totalOk ? "var(--green)" : "var(--red)", fontWeight: 600 }}>
              Total: {total.toFixed(2)} {totalOk ? "✓" : "— must equal 1.00"}
            </p>
          </div>

          <button className="btn-accent" onClick={save} disabled={saving || !totalOk} style={{ width: "100%" }}>
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </PageCard>
    </PageShell>
  );
}

function NumField({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input className="cream-input" type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

function PctField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input className="cream-input" type="number" step="0.01" min="0" max="1" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
