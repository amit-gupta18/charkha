"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { KNOWLEDGE_SOURCE_TYPES, KNOWLEDGE_TOPICS } from "@/lib/constants";
import type { KnowledgeNote } from "@/lib/types";
import { Alert, FieldLabel, PageCard, PageLoading, PageShell } from "@/components/ui/PageShell";
import { CreamSelect } from "@/components/ui/CreamSelect";

export default function KnowledgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [note, setNote] = useState<KnowledgeNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ title: string; sourceUrl: string; sourceType: string; topic: string; note: string }>({
    title: "", sourceUrl: "", sourceType: KNOWLEDGE_SOURCE_TYPES[0], topic: KNOWLEDGE_TOPICS[0], note: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ note: KnowledgeNote }>(`/api/knowledge/${id}`)
      .then((data) => {
        const n = data.note;
        setNote(n);
        setForm({ title: n.title, sourceUrl: n.sourceUrl ?? "", sourceType: String(n.sourceType), topic: String(n.topic), note: n.note });
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load note."))
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch<KnowledgeNote>(`/api/knowledge/${id}`, { method: "PUT", body: JSON.stringify(form) });
      setNote({ ...note!, title: form.title, sourceUrl: form.sourceUrl, sourceType: form.sourceType, topic: form.topic, note: form.note });
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this note?")) return;
    try {
      await apiFetch(`/api/knowledge/${id}`, { method: "DELETE" });
      router.push("/knowledge");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Delete failed.");
    }
  }

  if (loading) return <PageLoading message="Loading note..." />;
  if (error && !note) return (
    <PageShell title="Note not found" subtitle="Knowledge">
      <Alert type="error">{error}</Alert>
    </PageShell>
  );
  if (!note) return null;

  return (
    <PageShell
      title={editing ? "Edit Note" : note.title}
      subtitle="Knowledge"
      badge={<span className="badge badge-blue">{note.topic}</span>}
      actions={
        <div className="page-shell-actions">
          <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: "0.85rem" }} onClick={() => router.push("/knowledge")}>← Back</button>
          {!editing && <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: "0.85rem" }} onClick={() => setEditing(true)}>Edit</button>}
          <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: "0.85rem", color: "var(--red)" }} onClick={remove}>Delete</button>
        </div>
      }
    >
      {error && <Alert type="error">{error}</Alert>}

      {editing ? (
        <PageCard>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><FieldLabel>Title</FieldLabel><input className="cream-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><FieldLabel>Source URL</FieldLabel><input className="cream-input" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} /></div>
            <div className="form-grid-2">
              <CreamSelect value={form.sourceType} onChange={(sourceType) => setForm({ ...form, sourceType })} options={KNOWLEDGE_SOURCE_TYPES} />
              <CreamSelect value={form.topic} onChange={(topic) => setForm({ ...form, topic })} options={KNOWLEDGE_TOPICS} />
            </div>
            <textarea className="cream-input" rows={6} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" onClick={() => setEditing(false)} style={{ flex: "0 0 auto" }}>Cancel</button>
              <button className="btn-accent" onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? "Saving..." : "Save changes"}</button>
            </div>
          </div>
        </PageCard>
      ) : (
        <PageCard>
          <p style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>{note.note}</p>
          <div style={{ borderTop: "1px solid var(--border-light)", marginTop: 16, paddingTop: 12, fontSize: "0.78rem", color: "var(--text-muted)" }}>
            <p>Type: {note.sourceType}</p>
            {note.sourceUrl && <p><a href={note.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", fontWeight: 500 }}>{note.sourceUrl}</a></p>}
          </div>
        </PageCard>
      )}
    </PageShell>
  );
}
