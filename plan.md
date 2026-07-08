Voice Expense Tracker — Implementation Plan
Scope: Everything in architecture.md (MVP + knowledge base + coin system + yearly graph)
Stack: Next.js 14 (TS, App Router) frontend • Express+TS backend (render.yaml) • Neon Postgres + Prisma • OpenAI gpt-4o • Tailwind • Web Speech API
---
1. Repo Structure (monorepo, two apps)
google-rapid/
├── apps/
│   ├── web/                      # Next.js 14 frontend
│   │   ├── app/
│   │   │   ├── layout.tsx        # nav shell, Tailwind
│   │   │   ├── page.tsx          # / Dashboard
│   │   │   ├── log/page.tsx      # /log Voice logger
│   │   │   ├── expenses/page.tsx # /expenses list+filters
│   │   │   ├── weekly/page.tsx   # /weekly
│   │   │   ├── monthly/page.tsx  # /monthly (+ yearly graph)
│   │   │   ├── income/page.tsx   # /income
│   │   │   ├── settings/page.tsx # /settings
│   │   │   ├── knowledge/
│   │   │   │   ├── page.tsx          # /knowledge list
│   │   │   │   ├── new/page.tsx      # /knowledge/new
│   │   │   │   └── [id]/page.tsx     # view/edit
│   │   │   └── api/              # thin BFF proxies → Express
│   │   │       └── ...route.ts
│   │   ├── components/           # MicButton, ConfirmCard, ProgressBar, Heatmap, etc.
│   │   ├── lib/                  # apiClient, constants, types
│   │   └── package.json
│   └── api/                      # Express + TS backend
│       ├── src/
│       │   ├── index.ts          # express app
│       │   ├── routes/           # expenses, income, settings, parse, knowledge, coins
│       │   ├── services/         # openai.ts, coins.ts (coin logic)
│       │   ├── prisma.ts         # Prisma client singleton
│       │   └── utils/            # category→type map, date helpers
│       ├── prisma/
│       │   └── schema.prisma
│       └── package.json
├── packages/                     # shared types (optional, or duplicate)
├── render.yaml                   # Express deploy config
├── .env.example
└── architecture.md
---
## 2. Database — Prisma schema (`apps/api/prisma/schema.prisma`)
Models map 1:1 to architecture.md data models:
- `Expense` — date, description, category (enum), amount, payment_mode (enum), type (enum, derived), notes, created_at
- `Income` — date, amount, source (enum), notes, created_at
- `Settings` — singleton row, defaults: income 10000, weekly_limit 2500, needs 0.50, wants 0.30, savings 0.20
- `KnowledgeBase` — title, source_url?, source_type (enum), topic (enum), note, created_at
- `CoinTransaction` — date, amount (int), reason, reference_id?, created_at
Prisma enums mirror the architecture's enum lists. `categoryToType` map enforced in backend service layer (single source of truth).
Migrations via `prisma migrate dev`. Run against Neon via `DATABASE_URL` in `.env`.
---
3. Express Backend — Routes
Method
POST
GET/POST/PUT/DELETE
GET/POST/PUT
GET/PUT
GET/POST/PUT/DELETE
GET
GET
OpenAI service (services/openai.ts): system prompt embeds the 5 categories, payment modes, category→type rules, relative-date resolution. Returns strict JSON. Fails gracefully if OPENAI_API_KEY missing.
Coins service (services/coins.ts): on expense insert → if type==Want, create coin_transaction amount = -(amount/100) rounded. On knowledge note insert → +10. Weekly under-budget check runs on dashboard fetch → +50 (idempotent via reason+week key).
CORS enabled for the Next.js origin. render.yaml defines the api service.
---
4. Next.js Frontend — Pages
/log — Voice Logger (core)
- MicButton component wraps Web Speech API (SpeechRecognition). Handles start/stop, interim transcript, error fallback.
- On final transcript → POST /api/parse → ConfirmCard shows parsed fields (description, amount, category, payment_mode, date, notes), all editable.
- Confirm → POST /api/expenses → toast + redirect to dashboard.
- "Type manually" button → same ConfirmCard, empty, for fallback entry.
/ — Dashboard
- Monthly income display (sum income this month by source).
- Weekly progress bar (spend vs weekly_limit).
- Need/Want/Saving split (3 bars or donut).
- Quick stats: today / this week / this month spend.
- Recent expenses (last 10).
/expenses
- Table/list with client-side filtering (category, payment_mode, type, date range) + search.
- Inline edit + delete (modal or row expand).
/weekly
- Week-by-week table: spend vs limit, ratio %, color indicator, category breakdown expandable.
/monthly
- Month selector. Category totals, N/W/S vs budget, day-by-day bar chart.
- Yearly heatmap (52×7 GitHub-style grid) with color scale by spend intensity + hover tooltip (date, total, category breakdown).
/income
- Log income form (date, amount, source, notes). List of recent income entries.
/settings
- Edit monthly_income, weekly_limit, needs/wants/savings %. Validation that they sum to 1.0.
/knowledge, /knowledge/new, /knowledge/[id]
- List with search + topic filter. New note form. Detail/edit page.
---
5. Shared Bits
- Types (apps/web/lib/types.ts + apps/api/src/types.ts): mirror Prisma generated types; keep in sync manually (or use Prisma's generated types in api).
- Constants: category list, payment modes, category→type map (api is source of truth; web has copy for UI labels).
- API client (apps/web/lib/api.ts): fetch wrapper pointing at NEXT_PUBLIC_API_URL.
---
6. Config / Deploy
- .env.example: DATABASE_URL, OPENAI_API_KEY, PORT, NEXT_PUBLIC_API_URL, CORS_ORIGIN.
- render.yaml: web service (Next.js) + api service (Express). Both free tier.
- Web Speech API requires HTTPS + Chromium browser; note this in a README later.
---
7. Build Order (suggested)
1. Scaffold monorepo, Next.js app, Express app, Tailwind, Prisma+Neon connection.
2. Prisma schema + migrate. Seed default Settings row.
3. Express: expenses + income + settings CRUD (no AI yet).
4. Next.js: Dashboard, Expenses, Income, Settings pages wired to API.
5. OpenAI parse service + /log voice flow + ConfirmCard.
6. Weekly + Monthly views + yearly heatmap.
7. Knowledge base CRUD + pages.
8. Coin system (coin_transactions, service hooks, balance display).
9. Polish: error states, empty states, loading skeletons.
---
Open questions before I start coding
1. Auth: architecture says none. Confirm — no auth at all, single-user, API fully open? (Fine for personal/Vercel use.)
2. Coin under-budget bonus: should the +50 weekly bonus be computed automatically on dashboard load (idempotent), or via a manual "close week" action?
3. Yearly heatmap placement: you said build everything — keep it on /monthly as the doc suggests, or give it its own /calendar route?