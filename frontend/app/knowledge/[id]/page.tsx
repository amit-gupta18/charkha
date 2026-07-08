"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { KNOWLEDGE_SOURCE_TYPES, KNOWLEDGE_TOPICS } from "@/lib/constants";
import type { KnowledgeNote } from "@/lib/types";

export default function KnowledgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [note, setNote] = useState<KnowledgeNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ title: string; sourceUrl: string; sourceType: string; topic: string; note: string }>({ title: "", sourceUrl: "", sourceType: KNOWLEDGE_SOURCE_TYPES[0], topic: KNOWLEDGE_TOPICS[0], note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ note: KnowledgeNote }>(`/api/knowledge/${id}`)
      .then((data) => {
        const n = data.note;
        setNote(n);
        setForm({ title: n.title, sourceUrl: n.sourceUrl ?? "", sourceType: n.sourceType, topic: n.topic, note: n.note });
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load note."))
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await apiFetch<KnowledgeNote>(`/api/knowledge/${id}`, {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setNote({ ...note!, ...form });
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

  if (loading) return <Center>Loading...</Center>;
  if (error && !note) return <div className="mx-auto max-w-2xl px-6 py-8"><div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div></div>;
  if (!note) return null;

  return (
    <main className="px-6 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <button className="text-sm text-cyan-300 hover:text-cyan-200" onClick={() => router.push("/knowledge")}>← Back</button>
          <div className="flex gap-2">
            <button className="text-sm text-cyan-300 hover:text-cyan-200" onClick={() => setEditing((v) => !v)}>{editing ? "Cancel" : "Edit"}</button>
            <button className="text-sm text-red-300 hover:text-red-200" onClick={remove}>Delete</button>
          </div>
        </div>
        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        {editing ? (
          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <label className="block space-y-1"><span className="text-sm text-zinc-300">Title</span>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="block space-y-1"><span className="text-sm text-zinc-300">Source URL</span>
              <input className="input" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <select className="input" value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })}>
                {KNOWLEDGE_SOURCE_TYPES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                {KNOWLEDGE_TOPICS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <textarea className="input" rows={6} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <button className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60" onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        ) : (
          <article className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-white">{note.title}</h1>
              <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-xs text-cyan-200">{note.topic}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-zinc-200">{note.note}</p>
            <div className="border-t border-white/10 pt-3 text-xs text-zinc-500">
              <p>Type: {note.sourceType}</p>
              {note.sourceUrl && <p><a className="text-cyan-300 hover:underline" href={note.sourceUrl} target="_blank" rel="noreferrer">{note.sourceUrl}</a></p>}
            </div>
          </article>
        )}
      </div>
      <GlobalStyle />
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center px-6 text-sm text-zinc-300">{children}</main>;
}
function GlobalStyle() {
  return (
    <style jsx global>{`
      .input {
        width: 100%;
        border-radius: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.05);
        padding: 0.5rem 0.7rem;
        color: #fff;
        font-size: 0.85rem;
      }
      .input:focus { outline: none; border-color: rgba(56, 189, 248, 0.6); }
    `}</style>
  );
}
