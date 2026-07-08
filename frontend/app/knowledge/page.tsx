"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { KNOWLEDGE_TOPICS } from "@/lib/constants";
import type { KnowledgeNote } from "@/lib/types";

export default function KnowledgePage() {
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("");

  useEffect(() => {
    apiFetch<{ notes: KnowledgeNote[] }>("/api/knowledge")
      .then((data) => setNotes(data.notes))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load notes."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      notes
        .filter((n) => (topic ? n.topic === topic : true))
        .filter((n) => (search ? n.title.toLowerCase().includes(search.toLowerCase()) || n.note.toLowerCase().includes(search.toLowerCase()) : true))
        .sort((a, b) => (a.createdAt! < b.createdAt! ? 1 : -1)),
    [notes, topic, search]
  );

  if (loading) return <Center>Loading knowledge...</Center>;

  return (
    <main className="px-6 py-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-white">Knowledge Base</h1>
          <Link href="/knowledge/new" className="rounded-2xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-300">+ New Note</Link>
        </div>
        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className="input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">All topics</option>
            {KNOWLEDGE_TOPICS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-zinc-400">No notes found.</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((n) => (
              <li key={n.id}>
                <Link href={`/knowledge/${n.id}`} className="block rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-white">{n.title}</h2>
                    <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-xs text-cyan-200">{n.topic}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{n.note}</p>
                  <p className="mt-2 text-xs text-zinc-500">{n.sourceType}{n.sourceUrl ? ` · ${n.sourceUrl}` : ""}</p>
                </Link>
              </li>
            ))}
          </ul>
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
      .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    `}</style>
  );
}
