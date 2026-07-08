# Voice Expense Tracker — Architecture

Personal finance tracker with voice-first logging, built for a college student with fixed allowance + irregular freelance income.

---

## Core Idea

Speak an expense → AI parses it → saved to database → dashboards update automatically.

---

## High Level Flow

```
You speak
    │
    ▼
Web Speech API (browser, free)
    │  captures raw audio → converts to text
    ▼
OpenAI API (gpt-4o)
    │  parses text → structured JSON
    │  { date, description, category, amount, payment_mode, type, notes }
    ▼
Next.js API Route
    │  validates data → writes to DB
    ▼
Supabase (PostgreSQL)
    │  stores expense
    ▼
Dashboard updates automatically
```

---

## Feature List

### 1. Voice Logger (main feature)
- Tap mic button → speak expense → confirm → save
- Example: "Swiggy dinner 249 UPI" →
  - Description: Swiggy dinner
  - Amount: ₹249
  - Payment Mode: UPI
  - Category: Lifestyle Enjoyment (AI assigned)
  - Type: Want (auto from category)
  - Date: today (auto)
- Confirmation card shown before saving — edit if needed
- Manual entry fallback if voice fails

### 2. Dashboard
- Monthly income display (₹10k allowance + freelance logged separately)
- Weekly spend vs weekly limit (progress bar)
- Need / Want / Saving split for current month
- Quick stats: today's spend, this week's spend, this month's spend
- Recent expenses list

### 3. Expense Log
- Full list of all expenses
- Filter by: category, payment mode, type, date range
- Edit or delete any entry
- Search by description

### 4. Weekly View
- Week by week spend vs limit
- Ratio indicator (above 100% = overspent)
- Breakdown by category for each week

### 5. Monthly View
- Monthly total by category
- Need / Want / Saving breakdown vs budget
- Day by day spend for selected month
- Monthly score (same logic as Warikoo sheet)

### 6. Income Logger
- Log allowance received (monthly ₹10k from dad)
- Log freelance/internship income when it comes in
- Source tagging: Allowance / Freelance / Internship

### 7. Settings
- Set monthly income base
- Set weekly spending limit
- Adjust Need/Want/Saving targets

---

## Data Models

### expenses
```
id              uuid, primary key
date            date
description     text
category        enum (Life Infrastructure, Future Me,
                Performance & Growth,
                Relationships & Generosity,
                Lifestyle Enjoyment)
amount          numeric
payment_mode    enum (UPI, Cash, Credit Card,
                Debit Card, Bank Transfer)
type            enum (Need, Want, Saving) — auto from category
notes           text, nullable
created_at      timestamp
```

### income
```
id              uuid, primary key
date            date
amount          numeric
source          enum (Allowance, Freelance, Internship)
notes           text, nullable
created_at      timestamp
```

### settings
```
id              uuid, primary key
monthly_income  numeric (default 10000)
weekly_limit    numeric (default 2500)
needs_pct       numeric (default 0.50)
wants_pct       numeric (default 0.30)
savings_pct     numeric (default 0.20)
```

---

## Category → Type Mapping (from Warikoo logic)

```
Life Infrastructure        →  Need
Performance & Growth       →  Need
Future Me                  →  Saving
Relationships & Generosity →  Want
Lifestyle Enjoyment        →  Want
```

---

## AI Parsing Logic

OpenAI prompt given raw voice text, returns structured JSON:

```json
{
  "description": "Swiggy dinner",
  "amount": 249,
  "payment_mode": "UPI",
  "category": "Lifestyle Enjoyment",
  "notes": null
}
```

Date defaults to today automatically. If user says "spent yesterday", "bought last Friday", "on Monday" etc — OpenAI parses the relative or explicit date and resolves it to an actual date before saving.
Type is always derived from category, never parsed from voice.

---

## Tech Stack

```
Frontend        Next.js 14 (Typescript) (App Router)
Backend         Express + Typescript 
Styling         Tailwind CSS
Database        Neon DB(PostgreSQL, free tier)
AI Parsing      OpenAI API (gpt-4o)
Voice Input     Web Speech API (browser native, free)
Auth            None (personal use, no login needed)
Deployment      Vercel (free tier) , Render (render.yaml)

```

---

## Page Structure

```
/                   Dashboard — summary, weekly status, recent expenses
/log                Voice logger — mic button, confirmation card
/expenses           Full expense list with filters
/weekly             Weekly analysis view
/monthly            Monthly analysis view
/income             Income logger
/settings           App settings
```

---

## Voice → Save Flow (detailed)

```
1. User taps mic button on /log page

2. Web Speech API starts listening
   → converts speech to raw text string

3. Raw text sent to /api/parse (Next.js API route)
   → calls OpenAI gpt-4o with system prompt
   → returns structured JSON

4. Confirmation card shown to user
   → description, amount, category, payment mode displayed
   → user can edit any field before saving
   → user taps Confirm

5. POST /api/expenses
   → validates fields
   → writes to Supabase expenses table

6. Dashboard refreshes
   → weekly and monthly totals update automatically
```

---

## Calculated Values (no separate table)

All computed on the fly from expenses table:

- Weekly spend: SUM(amount) WHERE date in current week
- Monthly spend: SUM(amount) WHERE date in current month
- Need/Want/Saving split: GROUP BY type for current month
- Weekly ratio: weekly_spend / weekly_limit × 100
- Category breakdown: GROUP BY category for selected period

---

## Knowledge Base (Finance Persona)

A personal finance wiki built from things you actually watched, read, and learned — not generic advice.

### What it does
- Save a note from any video, article, podcast, or your own thinking
- Attach a source URL (YouTube, blog, whatever)
- Tag by topic
- Search and refer back anytime
- Over time it becomes your own finance persona — how you think about money, in your own words

### Data Model

```
knowledge_base
id              uuid, primary key
title           text (short summary of what you learned)
source_url      text, nullable (YouTube link, article etc)
source_type     enum (Video, Article, Podcast, Own Thought)
topic           enum (Budgeting, SIP, Investing, Insurance,
                Taxes, Debt, Income, General)
note            text (your own words — what you learned, why it matters)
created_at      timestamp
```

### Page: /knowledge

```
/knowledge              Full list of notes, searchable by topic or keyword
/knowledge/new          Add new note — title, source URL, topic, your note
/knowledge/[id]         View and edit a single note
```

### Flow

```
You watch a Warikoo video on SIP
    │
    ▼
Open /knowledge/new
    │
    ├── Title: "Start SIP early even with small amount"
    ├── Source URL: youtube.com/...
    ├── Source Type: Video
    ├── Topic: SIP
    └── Note: "Consistency matters more than amount.
               Even ₹500/month at 22 compounds significantly by 30.
               Habit > amount at this stage."
    │
    ▼
Saved to knowledge_base table
    │
    ▼
Searchable anytime — your own finance brain, built over time
```

---

## MVP Scope (build first)

- Voice logger with confirmation
- Dashboard with weekly status
- Expenses list
- Income logger
- Settings

## Later

- Yearly calendar view
- Export to CSV
- Monthly score system
- Spending insights / AI summary of month

---

## Yearly Expense Graph (GitHub style)

52 columns (weeks) × 7 rows (days) grid covering the full year. Each block = one day.

### Color Scale (spend intensity)
```
No spend        →  light grey / white
Light spend     →  light green
Normal spend    →  green
High spend      →  orange
Very high spend →  red
```

### Hover Tooltip shows
- Date
- Total spent that day
- Breakdown by category

### Page
Added to /monthly or as its own /calendar view.

---

## Coin System (Financial Literacy Score)

Tracks whether your financial literacy is keeping pace with your Want spending.

### Rules
```
Spend ₹100 on Wants          →  costs 1 coin
Log a knowledge base note    →  earn 10 coins
Complete week under budget   →  earn 50 bonus coins
```

Only Want category expenses cost coins.
Need and Saving expenses do not affect coin balance.

### Coin Balance
```
Positive balance  →  your learning is outpacing your want spending
Negative balance  →  you are spending more than you are learning
```

### Data Model addition
```
coin_transactions
id              uuid, primary key
date            date
amount          integer (positive = earned, negative = spent)
reason          text (e.g. "Want expense", "Knowledge note logged", "Under budget week")
reference_id    uuid, nullable (links to expense or knowledge_base row)
created_at      timestamp
```

Coin balance = SUM(amount) from coin_transactions.
