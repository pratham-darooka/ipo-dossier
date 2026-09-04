# IPO Dossier — Mainboard IPO Intelligence (Next.js + Neon + Groq)

Every IPO has a file. Read it before you bid: live subscription, GMP sentiment, DRHP forensics,
valuation vs peers, and **separate verdicts for listing-gain traders vs long-term investors**.

## Quickstart

```bash
cd ipo-dossier
cp .env.example .env   # ← PASTE your keys here when asked
# DATABASE_URL = Neon pooled string
# GROQ_API_KEY = groq.com API key (only AI provider)
# CRON_SECRET  = any random string

# One-time: paste supabase-neon-schema.sql into Neon SQL editor
npm run dev             # http://localhost:3000
```

## Content studio (Instagram engine)

Password-gated at `/studio` (`STUDIO_PASSWORD` env). See `SOCIAL_PLAYBOOK.md` for the full team workflow:
cadence (1/day, IPO at T-2), ZIP bundles, captions, no-repeat posted-log, Groq draft writer.

## How data flows (automated OSINT)

- `src/lib/scrapers/` → NSE upcoming-issues API, Chittorgarh dashboard, GMP aggregators (unofficial, timestamped), SEBI pipeline
- `GET /api/cron/scrape` → merges + upserts to Neon (`vercel.json` cron: daily 8am IST on Hobby; tighten to 30min market-hours on Pro)
- `GET /api/ipos?status=live` → Neon when `DATABASE_URL` works, else realistic seed fallback (`src/lib/data.ts`)
- `POST /api/ai/analyze {slug}` → deterministic scores first (`src/lib/scoring.ts`), then Groq `openai/gpt-oss-120b` narrative grounded on filing JSON only

## Pages

- `/` dashboard (Live / Upcoming / Listed + GMP-truth teaser)
- `/ipo/[slug]` the dossier: verdict duo, demand bars, fresh-vs-OFS donut, financials table, peers, listing-day playbook
- `/calendar` open→close→allot→list timeline · `/compare` side-by-side · `/performance` GMP-vs-actual ledger · `/watchlist` local + Neon-ready

## Design

Dark-default + light paper mode (`next-themes`), Fraunces display + Space Grotesk + JetBrains Mono numbers,
Lenis smooth scroll, Framer Motion reveals, ticker tape, score dials. `prefers-reduced-motion` respected.

## Compliance

Educational only — not investment advice. GMP labelled unofficial everywhere, never part of the long-term score.
Sources attributed (NSE/BSE/SEBI/RHP/registrars).
