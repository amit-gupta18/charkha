"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { KNOWLEDGE_SOURCE_TYPES, KNOWLEDGE_TOPICS } from "@/lib/constants";

export default function NewKnowledgePage() {
  const router = useRouter();
  const [form, setForm] = useState<{ title: string; sourceUrl: string; sourceType: string; topic: string; note: string }>({ title: "", sourceUrl: "", sourceType: KNOWLEDGE_SOURCE_TYPES[0], topic: KNOWLEDGE_TOPICS[0], note: "" });
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
      await apiFetch("/api/knowledge", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.push("/knowledge");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save note.");
      setSaving(false);
    }
  }

  return (
    <main className="px-6 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold text-white">New Knowledge Note</h1>
        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <label className="block space-y-1"><span className="text-sm text-zinc-300">Title</span>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="block space-y-1"><span className="text-sm text-zinc-300">Source URL</span>
            <input className="input" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1"><span className="text-sm text-zinc-300">Source Type</span>
              <select className="input" value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })}>
                {KNOWLEDGE_SOURCE_TYPES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="block space-y-1"><span className="text-sm text-zinc-300">Topic</span>
              <select className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                {KNOWLEDGE_TOPICS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          </div>
          <label className="block space-y-1"><span className="text-sm text-zinc-300">Note</span>
            <textarea className="input" rows={6} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
          <button className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-60" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>
      <GlobalStyle />
    </main>
  );
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
