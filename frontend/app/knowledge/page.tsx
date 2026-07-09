"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { KNOWLEDGE_TOPICS } from "@/lib/constants";
import type { KnowledgeNote } from "@/lib/types";
import { Alert, FieldLabel, PageCard, PageLoading, PageShell } from "@/components/ui/PageShell";
import { CreamSelect } from "@/components/ui/CreamSelect";

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

  if (loading) return <PageLoading message="Loading knowledge..." />;

  return (
    <PageShell
      title="Knowledge Base"
      subtitle="Finance persona / +10 coins per note"
      actions={
        <Link href="/knowledge/new" className="btn-accent" style={{ padding: "8px 16px", fontSize: "0.85rem", textDecoration: "none" }}>
          + New Note
        </Link>
      }
    >
      {error && <Alert type="error">{error}</Alert>}

      <PageCard>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
          Save what you learn about money. Each note earns <strong>10 coins</strong>. Want spending costs coins — keep learning to stay ahead.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><FieldLabel>Search</FieldLabel><input className="cream-input" placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div><FieldLabel>Topic</FieldLabel>
            <CreamSelect value={topic} onChange={setTopic} placeholder="All topics" options={KNOWLEDGE_TOPICS} />
          </div>
        </div>
      </PageCard>

      {filtered.length === 0 ? (
        <PageCard><p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>No notes found. Add your first learning!</p></PageCard>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((n) => (
            <Link key={n.id} href={`/knowledge/${n.id}`} style={{ textDecoration: "none" }}>
              <div className="card animate-fade-up" style={{ padding: "18px 22px", transition: "box-shadow 0.15s", boxShadow: "var(--shadow-sm)" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "var(--shadow-md)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "var(--shadow-sm)")}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <h2 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>{n.title}</h2>
                  <span className="badge badge-blue">{n.topic}</span>
                </div>
                <p style={{ marginTop: 6, fontSize: "0.85rem", color: "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{n.note}</p>
                <p style={{ marginTop: 8, fontSize: "0.72rem", color: "var(--text-muted)" }}>{n.sourceType}{n.sourceUrl ? ` · ${n.sourceUrl}` : ""}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
