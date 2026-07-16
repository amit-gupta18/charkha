"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { KNOWLEDGE_SOURCE_TYPES, KNOWLEDGE_TOPICS } from "@/lib/constants";
import { Alert, FieldLabel, PageCard, PageShell } from "@/components/ui/PageShell";
import { CreamSelect } from "@/components/ui/CreamSelect";

export default function NewKnowledgePage() {
  const router = useRouter();
  const [form, setForm] = useState<{ title: string; sourceUrl: string; sourceType: string; topic: string; note: string }>({
    title: "", sourceUrl: "", sourceType: KNOWLEDGE_SOURCE_TYPES[0], topic: KNOWLEDGE_TOPICS[0], note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!form.title || !form.note) {
      setError("Title and note are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/knowledge", { method: "POST", body: JSON.stringify(form) });
      router.push("/knowledge");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save note.");
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="New Knowledge Note"
      subtitle="Knowledge / +10 coins"
      actions={<Link href="/knowledge" className="btn-ghost" style={{ padding: "8px 14px", fontSize: "0.85rem", textDecoration: "none" }}>← Back</Link>}
    >
      {error && <Alert type="error">{error}</Alert>}
      <PageCard>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><FieldLabel>Title</FieldLabel><input className="cream-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What did you learn?" /></div>
          <div><FieldLabel>Source URL</FieldLabel><input className="cream-input" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="YouTube, article link..." /></div>
          <div className="form-grid-2">
            <div><FieldLabel>Source Type</FieldLabel>
              <CreamSelect value={form.sourceType} onChange={(sourceType) => setForm({ ...form, sourceType })} options={KNOWLEDGE_SOURCE_TYPES} />
            </div>
            <div><FieldLabel>Topic</FieldLabel>
              <CreamSelect value={form.topic} onChange={(topic) => setForm({ ...form, topic })} options={KNOWLEDGE_TOPICS} />
            </div>
          </div>
          <div><FieldLabel>Your Note</FieldLabel>
            <textarea className="cream-input" rows={6} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="In your own words — why it matters..." style={{ resize: "vertical" }} />
          </div>
          <button className="btn-accent" onClick={submit} disabled={saving} style={{ width: "100%" }}>
            {saving ? "Saving..." : "Save note (+10 coins)"}
          </button>
        </div>
      </PageCard>
    </PageShell>
  );
}
