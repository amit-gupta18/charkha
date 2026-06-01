# Agent Memory OS — Architecture

> A persistent, queryable, self-improving memory infrastructure layer that any AI agent can plug into. Agents remember what they did, learn from past runs, and get smarter over time without retraining.

---

## Table of Contents

1. [Core Philosophy](#1-core-philosophy)
2. [Feature Set](#2-feature-set)
3. [System Architecture](#3-system-architecture)
4. [Memory Model](#4-memory-model)
5. [MongoDB Schema Design](#5-mongodb-schema-design)
6. [MCP Tool Interface](#6-mcp-tool-interface)
7. [Agent Builder Integration](#7-agent-builder-integration)
8. [API Reference](#8-api-reference)
9. [Data Flow Diagrams](#9-data-flow-diagrams)
10. [Tech Stack](#10-tech-stack)
11. [Project Structure](#11-project-structure)
12. [Hackathon Qualification Checklist](#12-hackathon-qualification-checklist)

---

## 1. Core Philosophy

Most AI agents are amnesiac. Every run starts from zero. They can't learn from what worked, can't recall what they already explored, can't build on prior decisions.

Agent Memory OS solves this with three principles:

- **Memory is infrastructure, not an afterthought.** It sits as a layer beneath agents, not bolted on top.
- **Three memory types, each serving a different purpose.** Episodic (what happened), Semantic (what is known), Procedural (what worked). Mirroring how human memory actually works.
- **MongoDB as the single source of truth.** Document flexibility for episodic events, vector search for semantic recall, aggregation pipelines for procedural synthesis — no polyglot database sprawl.

---

## 2. Feature Set

### 2.1 Memory Ingestion

- `remember(content, type, context)` — store any content as episodic, semantic, or procedural memory
- Automatic embedding generation via Voyage AI (MongoDB native) on every semantic write
- Configurable TTL per memory type (episodic decays, semantic persists, procedural strengthens with use)
- Agent identity scoping — memories are namespaced per `agent_id`, shareable across agents via shared namespace

### 2.2 Memory Retrieval

- `recall(query, type?, limit?, min_score?)` — vector search over semantic memory, returns ranked results with similarity scores
- `episode(action?, agent_id?, time_range?)` — filtered retrieval of episodic history
- `pattern(task_type)` — surface successful procedural patterns from past runs with success rate and step breakdown
- Hybrid search: combines vector similarity + BM25 keyword match for recall accuracy

### 2.3 Memory Reflection

- `reflect(topic)` — runs a MongoDB aggregation pipeline over episodic + semantic memory to synthesise a structured insight summary
- Detects contradictions between stored facts and flags them as conflicts
- Auto-generates "memory summaries" nightly via a scheduled reflection pass, compressing episodic logs into semantic facts

### 2.4 Memory Management

- `forget(memory_id)` — hard delete or soft deprecation (mark as stale, exclude from retrieval but preserve for audit)
- `decay()` — bulk TTL enforcement, archives episodic memories older than configured threshold
- `stats(agent_id)` — returns memory usage: total stored, retrieval hit rate, most-recalled memories, knowledge gaps (queries that returned no results)

### 2.5 Demo Agent — Research Intelligence Agent

A reference agent included in the repo that demonstrates all memory types in action:

- **Task:** "Research LLM memory architectures and build a knowledge base"
- **Run 1:** agent finds nothing in memory, searches web, stores findings as semantic memories, logs the session as episodic
- **Run 2:** agent recalls prior research, skips what it already knows, builds on existing knowledge
- **Run 3:** agent reflects, identifies gaps, generates a synthesis report — visibly smarter than Run 1

This makes the memory improvement tangible and demonstrable to judges in a 3-minute video.

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT AGENTS                                │
│   (Google Cloud Agent Builder · LangChain · CrewAI · custom)       │
└────────────────────┬────────────────────────────────────────────────┘
                     │  MCP protocol calls
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENT MEMORY OS — MCP SERVER                     │
│                                                                     │
│   ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐   │
│   │  remember() │  │   recall()   │  │       reflect()         │   │
│   │  forget()   │  │   episode()  │  │       pattern()         │   │
│   │  decay()    │  │   stats()    │  │       (synthesis)       │   │
│   └──────┬──────┘  └──────┬───────┘  └───────────┬─────────────┘   │
│          │                │                      │                  │
│   ┌──────▼────────────────▼──────────────────────▼──────────────┐   │
│   │              MEMORY ORCHESTRATION LAYER                      │   │
│   │   - Routes writes/reads to correct memory type               │   │
│   │   - Handles embedding generation (Voyage AI)                 │   │
│   │   - Enforces TTL, agent_id scoping, conflict detection       │   │
│   └──────────────────────────┬───────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         MONGODB ATLAS                               │
│                                                                     │
│   ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│   │ episodic_memory │  │ semantic_memory  │  │procedural_memory │  │
│   │                 │  │                  │  │                  │  │
│   │ - timestamp     │  │ - embedding[]    │  │ - task_type      │  │
│   │ - agent_id      │  │   (Atlas Vector  │  │ - steps[]        │  │
│   │ - action        │  │    Search)       │  │ - success_rate   │  │
│   │ - result        │  │ - content        │  │ - last_used      │  │
│   │ - context{}     │  │ - source         │  │ - outcomes[]     │  │
│   │ - ttl           │  │ - confidence     │  │                  │  │
│   └─────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  Atlas Vector Search Index (semantic_memory.embedding)       │  │
│   │  Voyage AI embeddings · 1024-dim · cosine similarity         │  │
│   └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     GOOGLE CLOUD AGENT BUILDER                      │
│    Hosts the Research Intelligence Agent demo                       │
│    Orchestrates multi-step task execution                           │
│    Calls Agent Memory OS MCP tools at each reasoning step           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Memory Model

### 4.1 Memory Type Comparison

| Property          | Episodic                        | Semantic                         | Procedural                        |
|-------------------|---------------------------------|----------------------------------|-----------------------------------|
| What it stores    | Events — what happened when     | Facts — what is known            | Patterns — what worked            |
| Write trigger     | Every agent action               | Agent learns a new fact          | Successful task completion        |
| Retrieval method  | Filtered query (time, agent)    | Vector similarity search         | Task-type lookup + success rank   |
| Decay             | Yes — TTL 30 days default       | No — persists until contradicted | Strengthens with successful reuse |
| MongoDB primitive | Standard document query         | Atlas Vector Search              | Aggregation pipeline              |
| Human analogy     | "I remember doing that last week"| "I know that Paris is in France" | "I know how to ride a bike"       |

### 4.2 Memory Lifecycle

```
                    ┌─────────────┐
                    │   WORKING   │  ← agent's current context window
                    │   MEMORY    │    (not stored, ephemeral)
                    └──────┬──────┘
                           │  agent calls remember()
              ┌────────────┼────────────────┐
              ▼            ▼                ▼
     ┌─────────────┐  ┌─────────┐  ┌───────────────┐
     │  EPISODIC   │  │SEMANTIC │  │  PROCEDURAL   │
     │  (what      │  │(what    │  │  (what        │
     │  happened)  │  │is known)│  │  worked)      │
     └──────┬──────┘  └────┬────┘  └───────┬───────┘
            │              │               │
            │  reflect()   │               │
            └──────────────┘               │
                    │ synthesis             │ pattern()
                    ▼                       ▼
             semantic memory         procedural memory
             (compressed facts)      (updated success rate)
            │
            │ TTL expires
            ▼
         archived / deleted
```

---

## 5. MongoDB Schema Design

### 5.1 `episodic_memory` collection

```json
{
  "_id": "ObjectId",
  "agent_id": "string",
  "session_id": "string",
  "timestamp": "ISODate",
  "action": "string",
  "input": "object",
  "result": "object",
  "success": "boolean",
  "duration_ms": "number",
  "context": {
    "task": "string",
    "step_number": "number",
    "total_steps": "number",
    "parent_episode_id": "ObjectId | null"
  },
  "tags": ["string"],
  "ttl_expires_at": "ISODate"
}
```

**Indexes:**
- `{ agent_id: 1, timestamp: -1 }` — primary retrieval
- `{ ttl_expires_at: 1 }` — TTL index for automatic expiry
- `{ session_id: 1 }` — session grouping

---

### 5.2 `semantic_memory` collection

```json
{
  "_id": "ObjectId",
  "agent_id": "string",
  "content": "string",
  "source": {
    "type": "web | tool | agent | human",
    "url": "string | null",
    "episode_id": "ObjectId | null"
  },
  "embedding": [1024 floats],
  "confidence": "number (0.0–1.0)",
  "created_at": "ISODate",
  "last_recalled_at": "ISODate",
  "recall_count": "number",
  "tags": ["string"],
  "status": "active | stale | conflicted",
  "conflicts_with": ["ObjectId"]
}
```

**Indexes:**
- Atlas Vector Search index on `embedding` field (cosine, 1024-dim)
- `{ agent_id: 1, status: 1 }` — active memory filter
- `{ recall_count: -1 }` — surface most-used memories

---

### 5.3 `procedural_memory` collection

```json
{
  "_id": "ObjectId",
  "agent_id": "string",
  "task_type": "string",
  "description": "string",
  "steps": [
    {
      "order": "number",
      "action": "string",
      "tool_call": "string | null",
      "notes": "string"
    }
  ],
  "success_count": "number",
  "failure_count": "number",
  "success_rate": "number (0.0–1.0)",
  "avg_duration_ms": "number",
  "last_used_at": "ISODate",
  "outcomes": [
    {
      "session_id": "string",
      "success": "boolean",
      "timestamp": "ISODate"
    }
  ]
}
```

**Indexes:**
- `{ agent_id: 1, task_type: 1 }` — procedure lookup
- `{ success_rate: -1 }` — surface best procedures first

---

## 6. MCP Tool Interface

The Agent Memory OS exposes 8 tools via the MongoDB MCP Server protocol. Any MCP-compatible agent (Google Agent Builder, Claude, GPT-4o with tools, LangChain) can call these.

### Tool Definitions

```python
TOOLS = [
    {
        "name": "remember",
        "description": "Store a memory. Specify type: 'episodic' for events, 'semantic' for facts, 'procedural' for task patterns.",
        "input_schema": {
            "content": "string — what to remember",
            "type": "episodic | semantic | procedural",
            "agent_id": "string",
            "context": "object (optional) — additional metadata",
            "tags": "list[string] (optional)"
        }
    },
    {
        "name": "recall",
        "description": "Retrieve relevant memories via vector similarity search over semantic memory.",
        "input_schema": {
            "query": "string — natural language query",
            "agent_id": "string",
            "type": "semantic | episodic | procedural | all",
            "limit": "int (default 5)",
            "min_score": "float (default 0.7)"
        }
    },
    {
        "name": "episode",
        "description": "Retrieve episodic history filtered by agent, action type, or time range.",
        "input_schema": {
            "agent_id": "string",
            "action_filter": "string (optional)",
            "since": "ISO timestamp (optional)",
            "limit": "int (default 20)"
        }
    },
    {
        "name": "reflect",
        "description": "Run a synthesis pass over memory for a topic. Returns structured insights, contradictions, and knowledge gaps.",
        "input_schema": {
            "topic": "string",
            "agent_id": "string",
            "include_episodic": "boolean (default true)",
            "include_semantic": "boolean (default true)"
        }
    },
    {
        "name": "pattern",
        "description": "Retrieve the most successful procedural pattern for a given task type.",
        "input_schema": {
            "task_type": "string",
            "agent_id": "string",
            "min_success_rate": "float (default 0.6)"
        }
    },
    {
        "name": "forget",
        "description": "Deprecate or hard-delete a memory by ID.",
        "input_schema": {
            "memory_id": "string",
            "mode": "soft | hard (default soft)"
        }
    },
    {
        "name": "decay",
        "description": "Run TTL enforcement — archive episodic memories past their expiry threshold.",
        "input_schema": {
            "agent_id": "string (optional — omit to run across all agents)"
        }
    },
    {
        "name": "stats",
        "description": "Return memory usage statistics for an agent: total memories, recall hit rate, most-recalled facts, knowledge gaps.",
        "input_schema": {
            "agent_id": "string"
        }
    }
]
```

---

## 7. Agent Builder Integration

The demo Research Intelligence Agent runs entirely on Google Cloud Agent Builder. It uses Agent Memory OS as its sole external tool set via MCP.

### Agent System Prompt

```
You are a Research Intelligence Agent with persistent memory.
Before starting any research task, always:
  1. Call recall() to check what you already know
  2. Call episode() to review what you already attempted
  3. Call pattern() to retrieve the best research procedure

After completing research:
  4. Call remember(type="semantic") for every new fact discovered
  5. Call remember(type="episodic") to log this session
  6. Call remember(type="procedural") to update the research pattern with this run's outcome

If asked to synthesise: call reflect() first.
Never re-research something already in memory unless the user explicitly asks.
Your goal is to get measurably smarter with every run.
```

### Multi-Step Task Execution Flow

```
USER: "Research transformer attention mechanisms and what improvements
       have been proposed in 2024–2025"
         │
         ▼
STEP 1 ─ recall(query="transformer attention mechanisms", type="semantic")
         → returns: 3 existing facts about transformers stored from prior run
         → agent notes: "I already know about scaled dot-product attention"
         │
         ▼
STEP 2 ─ episode(action_filter="web_search", since="2025-01-01")
         → returns: prior searches logged, including "flash attention paper"
         → agent notes: "I already searched FlashAttention, skip that"
         │
         ▼
STEP 3 ─ pattern(task_type="research_synthesis")
         → returns: best procedure from prior runs
         → agent follows proven steps
         │
         ▼
STEP 4 ─ [agent searches web for NEW gaps identified in steps 1-2]
         → discovers: "Multi-Head Latent Attention (MLA) in DeepSeek-V2"
         │
         ▼
STEP 5 ─ remember(content="MLA reduces KV cache memory by...", type="semantic")
         remember(content="Session: found MLA paper, 3 new facts", type="episodic")
         remember(task_type="research_synthesis", steps=[...], success=True, type="procedural")
         │
         ▼
STEP 6 ─ reflect(topic="transformer attention mechanisms")
         → synthesises ALL stored knowledge into a structured report
         → flags any contradictions
         │
         ▼
RESPONSE: Structured research report, grounded in memory, cites what is new vs known
```

---

## 8. API Reference

The MCP server also exposes a REST API for direct integration and the dashboard.

```
POST   /api/memory/remember          Store a memory
GET    /api/memory/recall             Vector search retrieval
GET    /api/memory/episode            Episodic history query
POST   /api/memory/reflect            Trigger reflection synthesis
GET    /api/memory/pattern            Procedural pattern lookup
DELETE /api/memory/{id}               Forget a memory
GET    /api/memory/stats/{agent_id}   Usage statistics
POST   /api/memory/decay              TTL enforcement run

GET    /api/agents                    List registered agents
POST   /api/agents                    Register new agent
GET    /api/agents/{id}/dashboard     Dashboard data for UI
```

---

## 9. Data Flow Diagrams

### 9.1 Write Flow — `remember(type="semantic")`

```
Agent calls remember()
        │
        ▼
MCP Server receives tool call
        │
        ▼
Memory Orchestration Layer
  ├─ Validates content, agent_id
  ├─ Detects memory type → "semantic"
  ├─ Calls Voyage AI embedding API
  │    └─ Returns 1024-dim float vector
  ├─ Checks for conflicts:
  │    └─ recall(query=content, min_score=0.95)
  │         ├─ score > 0.95 → potential duplicate → flag conflict
  │         └─ score < 0.95 → no conflict → proceed
  └─ Writes document to MongoDB Atlas
       └─ { content, embedding, source, confidence, ... }
        │
        ▼
Returns: { memory_id, status: "stored" | "conflict_flagged" }
```

### 9.2 Read Flow — `recall(query)`

```
Agent calls recall(query="transformer attention")
        │
        ▼
MCP Server receives tool call
        │
        ▼
Memory Orchestration Layer
  ├─ Generates query embedding via Voyage AI
  ├─ Runs Atlas Vector Search:
  │    $vectorSearch: {
  │      index: "semantic_embedding_index",
  │      path: "embedding",
  │      queryVector: [...],
  │      numCandidates: 50,
  │      limit: 5,
  │      filter: { agent_id: "...", status: "active" }
  │    }
  ├─ Post-filters by min_score threshold
  ├─ Updates last_recalled_at + recall_count on matched docs
  └─ Returns ranked results with similarity scores
        │
        ▼
Returns: [{ content, score, source, confidence, memory_id }, ...]
```

### 9.3 Reflection Flow — `reflect(topic)`

```
Agent calls reflect(topic="LLM memory architectures")
        │
        ▼
Memory Orchestration Layer
  ├─ recall(query=topic) → top 20 semantic memories
  ├─ episode(action_filter=topic) → related episodic logs
  │
  ├─ MongoDB Aggregation Pipeline:
  │    [
  │      { $match: { tags: topic, status: "active" } },
  │      { $group: { _id: "$tags", count: { $sum: 1 },
  │                  avg_confidence: { $avg: "$confidence" } } },
  │      { $sort: { count: -1 } }
  │    ]
  │
  ├─ Passes retrieved memories + aggregation result to Gemini 3
  ├─ Gemini generates: summary, contradictions[], gaps[], confidence
  └─ Stores synthesis as new high-confidence semantic memory
        │
        ▼
Returns: { summary, contradictions, gaps, source_count, generated_at }
```

---

## 10. Tech Stack

| Layer                   | Technology                                        | Reason                                           |
|-------------------------|---------------------------------------------------|--------------------------------------------------|
| Agent Orchestration     | Google Cloud Agent Builder                        | Hackathon requirement · managed hosting          |
| LLM                     | Gemini 3 (gemini-3-flash / gemini-3-pro)         | Hackathon requirement · multi-step reasoning     |
| MCP Server              | Python · FastAPI · mcp[server] SDK               | Official MCP protocol implementation            |
| Primary Database        | MongoDB Atlas (M0 free tier)                      | Document model + vector search + aggregations   |
| Vector Search           | MongoDB Atlas Vector Search                       | Native to Atlas · no external vector DB needed  |
| Embeddings              | Voyage AI (voyage-3 · 1024-dim)                  | MongoDB native · strong on technical content    |
| Backend Framework       | FastAPI + async Motor (MongoDB async driver)      | Non-blocking I/O for concurrent agent calls     |
| Frontend Dashboard      | Next.js 14 (App Router) + Tailwind CSS           | Fast to build · real-time via SSE               |
| Real-time Events        | MongoDB Change Streams → Server-Sent Events      | Live memory activity feed in dashboard          |
| Auth                    | API key per agent_id                              | Simple · sufficient for hackathon scope          |
| Deployment              | Vercel (frontend) · Google Cloud Run (MCP server)| Free tier · fast deploys                        |
| Language                | Python 3.12 (backend) · TypeScript (frontend)    | Ecosystem fit                                    |

### What is intentionally NOT used

- **Pinecone / Qdrant / Weaviate** — MongoDB Atlas Vector Search handles this natively. No polyglot DB complexity.
- **LangChain memory modules** — we ARE the memory layer, not a consumer of one.
- **Redis for caching** — MongoDB TTL indexes + in-process caching is sufficient at this scale.
- **Neo4j / graph DB** — memory relationships are modelled as MongoDB document references + aggregation. Keeps the stack focused.

---

## 11. Project Structure

```
agent-memory-os/
│
├── mcp_server/                    # Core MCP server (Python)
│   ├── main.py                    # FastAPI app + MCP endpoint
│   ├── tools/
│   │   ├── remember.py            # Write tool implementations
│   │   ├── recall.py              # Vector search retrieval
│   │   ├── reflect.py             # Reflection + aggregation
│   │   ├── episode.py             # Episodic history queries
│   │   ├── pattern.py             # Procedural memory
│   │   ├── forget.py              # Deprecation + delete
│   │   └── stats.py               # Usage statistics
│   ├── db/
│   │   ├── atlas.py               # MongoDB Atlas connection (Motor)
│   │   ├── indexes.py             # Index creation + Vector Search setup
│   │   └── schemas.py             # Pydantic models for all collections
│   ├── embeddings/
│   │   └── voyage.py              # Voyage AI embedding client
│   └── orchestrator.py            # Memory routing + conflict detection
│
├── demo_agent/                    # Research Intelligence Agent
│   ├── agent_builder_config.yaml  # Google Cloud Agent Builder definition
│   ├── system_prompt.txt          # Full agent system prompt
│   ├── run_demo.py                # CLI runner for demo scenarios
│   └── scenarios/
│       ├── run1_cold_start.py     # First run — no memory
│       ├── run2_warm.py           # Second run — uses memory
│       └── run3_reflect.py        # Third run — synthesis
│
├── dashboard/                     # Next.js frontend
│   ├── app/
│   │   ├── page.tsx               # Memory activity feed
│   │   ├── memories/page.tsx      # Browse all memories
│   │   ├── agents/page.tsx        # Per-agent stats
│   │   └── reflect/page.tsx       # Trigger + view reflections
│   └── components/
│       ├── MemoryGraph.tsx        # Force-directed memory graph
│       ├── RecallScore.tsx        # Similarity score visualiser
│       └── AgentTimeline.tsx      # Episodic timeline view
│
├── scripts/
│   ├── seed_demo_data.py          # Pre-populate demo memories
│   ├── setup_atlas_indexes.py     # One-shot Atlas Vector Search setup
│   └── benchmark_recall.py        # Recall precision benchmarks
│
├── tests/
│   ├── test_remember.py
│   ├── test_recall.py
│   └── test_reflect.py
│
├── .env.example
├── docker-compose.yml             # Local dev environment
├── requirements.txt
├── README.md
└── ARCHITECTURE.md                # ← this file
```

---

## 12. Hackathon Qualification Checklist

This section maps Agent Memory OS directly to the Google Cloud Rapid Agent Hackathon's three qualifying criteria.

### Requirement 1 — Beyond Chat ✅

> "The agent must DO something — manage a database, automate a workflow, or call an API — rather than just providing text responses."

The agent performs real write operations on every run:
- Writes new memories to MongoDB Atlas (`remember()`)
- Updates `recall_count` and `last_recalled_at` on retrieved documents
- Runs aggregation pipelines to synthesise reflections (`reflect()`)
- Archives expired episodic memories (`decay()`)

This is not retrieval-augmented generation. The database state changes with every agent run.

---

### Requirement 2 — Multi-Step Planning ✅

> "The system must demonstrate the ability to take a complex goal, break it into steps, and execute them under user oversight."

Every Research Agent task executes a minimum of 6 sequential tool calls with decision branching:

```
Step 1  recall()        → check what is already known
Step 2  episode()       → check what was already attempted
Step 3  pattern()       → retrieve best procedure for this task type
Step 4  [web search]    → only research what is genuinely new
Step 5  remember() ×N   → store each new discovery
Step 6  reflect()       → synthesise and surface knowledge gaps
```

The agent's Step 4 behaviour changes based on Steps 1–2 output. That is planning, not a pipeline.

---

### Requirement 3 — MongoDB MCP Integration ✅

> "You must integrate at least one participating partner's Model Context Protocol (MCP) server."

Agent Memory OS **is** the MCP server, built on MongoDB Atlas. Every tool call in the agent's reasoning loop goes through MCP:
- `remember()` → MongoDB Atlas document write
- `recall()` → MongoDB Atlas Vector Search
- `reflect()` → MongoDB Atlas aggregation pipeline
- `episode()` → MongoDB Atlas filtered query
- `pattern()` → MongoDB Atlas aggregation + sort

The MongoDB MCP Server is the entire backbone of the system, not an optional integration.

---

*Last updated: June 2026*