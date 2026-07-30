# Pulse — Personal Productivity Dashboard

A Next.js 14 (App Router) productivity dashboard with Neon Postgres persistence, ready for Vercel.

## Features

- **Tasks** — priorities, due dates, focus / done workflow
- **Habits** — daily check-ins with streak tracking
- **Notes** — quick capture scratchpad
- **Goals** — progress tracking with incremental updates
- **Overview stats** — open tasks, habits completed, done today, goals on track

## Stack

- Next.js 14 App Router + Server Actions
- Drizzle ORM + `@neondatabase/serverless`
- Tailwind CSS (custom theme)
- Vercel deployment

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Neon database

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string
3. Create `.env.local`:

```bash
cp .env.example .env.local
```

Set:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

### 3. Apply the schema

Either push with Drizzle:

```bash
npm run db:push
```

Or run the SQL migration in the Neon SQL editor:

```text
drizzle/0000_init.sql
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If the database is empty, use **Load sample data** on the dashboard.

## Deploy on Vercel

1. Push this repo to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add the `DATABASE_URL` environment variable (Neon → Vercel integration works well)
4. Deploy

The app uses `dynamic = "force-dynamic"` so pages always read fresh data from Neon at request time.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:push` | Push schema to Neon |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:studio` | Open Drizzle Studio |

## Project layout

```text
src/
  app/           # App Router pages + server actions
  components/    # Dashboard UI
  db/            # Drizzle schema + Neon client
  lib/           # Data access helpers
drizzle/         # SQL migration
```
