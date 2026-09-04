# IPO Dossier — Social Playbook (Instagram)

How the page runs, for the whole team. Posting workflow lives at `/studio` (password-gated, ask for the studio key).

## Cadence: 1 post/day, 8 PM IST

- An IPO opens on day X → its 5-slide carousel posts on **X-2** (anticipation + apply window).
- Every other day → one evergreen/fresh-tape post. Beginner ↔ expert alternate.
- The studio's 14-day queue plans this automatically from live data. Trust the order.

## Daily workflow (5 minutes)

1. Open `/studio`, unlock with the team password.
2. Top of the queue = today's post. Preview slides with arrows/keyboard.
3. **Download ZIP** (slides + `caption.md`), post natively in the Instagram app.
4. Hit **Posted** — this syncs the shared log so nobody reposts it, on any device.
5. Copy the caption from the preview pane (hashtags rotate automatically per post).

## Never repeat rule

- The scheduler excludes everything in the posted-log (Neon `social_posts`, shared across the team).
- Freshness order: live tape posts (regenerated from current numbers) → team drafts → unposted bank → explicit RECYCLE (oldest, flagged — refresh its copy first).
- Out of fresh ideas? Hit **New post** (pillar/level optional) — Groq drafts one avoiding all existing topics. It lands in the queue as a draft.

## Evergreen bank: how to contribute (GitHub)

- Entries live in `src/lib/social/evergreen.ts` — one object per post: `id, level, pillar, cover, sub, points[], cta, template`.
- Templates (`src/lib/social/slides.tsx`): `numbered` (default), `duel`, `stat`, `checklist`, `timeline`, `mythfact`. Same Frame/header/footer tokens — never invent new colors.
- Rules: concrete numbers over fluff, no guaranteed returns, educational tone, ≤110 chars per point.
- Open a PR; the studio picks new entries up on next deploy. No DB changes needed.

## Data-driven posts (auto-fresh, no human needed)

`src/lib/social/generated.ts` builds posts from live rows: demand leader, next-opener countdown, biggest ledger pop, GMP accuracy stat. These refresh as numbers move — same template, new numbers, never a stale repeat.

## Captions & reach

- `src/lib/social/captions.ts` builds every caption; hashtag sets rotate 3 ways by post id (identical blocks post after post throttle reach).
- Full fortnight export: **All captions.md** button in studio.

## Auto-posting (phase 2, when Meta approves)

1. IG → Business/Creator; link a Facebook Page.
2. Meta App with `instagram_content_publish`; get long-lived token.
3. Set `IG_USER_ID` + `IG_ACCESS_TOKEN` (+ `FB_PAGE_ID`) on Vercel.
4. `POST /api/social/publish { kind, ref, slides, caption }` — uploads carousel PNGs (public endpoints) and publishes.
5. Keep manual posting until 1k followers — native behavior outperforms scheduled posts while small.

## Budgets

- Tavily: ~20/day cron + ~1 per doc resolve. Watch the 1000/mo cap in week 4.
- Groq: drafts on demand only (~1k tokens each). Pipeline verdicts are the main spend.
- PNG endpoints are public-but-unlisted (Meta must fetch them later). Never link them publicly; studio is `noindex`.
