# Pulse — Personal Life Dashboard

A Next.js 14 (App Router) personal life dashboard with Neon Postgres persistence, ready for Vercel — inspired by Casey Danielle’s life-dashboard workflow.

## What’s included

- **Week view** — checklist (with confetti + pop sound), gym tracker, weekly focus, reflections, currently reading, Google Calendar events, week navigation
- **Habits** — weekly grid (daily + devotional), custom icons/colors/goals, score ring, manage modal
- **Quarter** — credit cards & savings, quarterly goals by category, achievements, parking lot, books finished, 13-week gym chart
- **Year** — vision / non-negotiables / focus / change, theme buckets, yearly goals
- **Bucket list** — filterable categories with progress
- **Open Library** book search
- **Google Calendar** OAuth sync
- **Twilio SMS** morning briefing + `done 1 2` / `done all` replies
- **Vercel Cron** at 12:00 UTC (8am ET) for the briefing

## Architecture note

Dashboard state is stored as **one flexible JSON object per user** in Neon (`dashboard_state.data`). Adding features means adding keys — no table reshuffles. Autosave on the client is throttled (~650ms) so edits persist without hammering the DB.

## Setup

```bash
npm install
cp .env.example .env.local
```

Set `DATABASE_URL`, then either:

- open the app once (tables auto-create on first request), or
- run `npm run db:push`, or
- apply `drizzle/0000_init.sql` in the Neon SQL editor

```bash
npm run dev
```

## Deploy on Vercel

1. Import the repo
2. Add env vars from `.env.example`
3. Deploy
4. For SMS replies, point your Twilio webhook to `/api/sms/inbound`
5. For Google Calendar, set `GOOGLE_REDIRECT_URI` to exactly  
   `https://YOUR_DOMAIN/api/auth/google/callback`  
   and enable offline access (`prompt=consent` is already wired)

### Cron auth

If `CRON_SECRET` is set, Vercel Cron should send:

```http
Authorization: Bearer $CRON_SECRET
```

## Environment variables

See `.env.example` for the full list (Neon, Google, Twilio, Cron).
