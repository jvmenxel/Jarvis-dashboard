# Jarvis — Executive Assistant Dashboard

A local-first, token-efficient personal AI operating system: dashboard, chat,
tasks, notes, long-term memory, and an automations shell. Built with Next.js,
TypeScript, Tailwind, Prisma + SQLite, Clerk (optional), and a swappable AI
provider layer.

Designed to run **fully local on first `npm run dev`** — no external accounts
required. Add Clerk and an AI key when you want auth and real replies.

---

## Stack

- Next.js 16 (App Router, Turbopack) · React 19 · TypeScript
- Tailwind CSS v4 — restrained dark theme with a cyan accent
- Prisma 7 + SQLite (Postgres-ready)
- Clerk for auth (optional — a dev fallback user runs if keys are missing)
- Provider-agnostic AI layer (Anthropic / OpenAI / local fallback) with:
  - an **intent router** so CRUD-ish turns never hit a model
  - top-k memory retrieval instead of dumping the full store
  - a rolling conversation summary to keep prompts tiny
  - per-request size class (`small` / `medium` / `large`) → cheap default model
  - usage telemetry in the DB (`UsageEvent` table + visible in `/settings`)

---

## Quick start

```bash
# 1. Install deps (already done during scaffolding)
npm install

# 2. Create the SQLite database + migrations (already done)
npx prisma migrate dev

# 3. Start the dev server
npm run dev
# → http://localhost:3000
```

The app redirects `/` to `/dashboard`. In dev mode you'll see a `dev mode`
badge in the top bar — that means Clerk isn't configured yet, and you're
using the single local fallback user. All features still work.

---

## Folder structure

```
app/
  (app)/                 route group with the shared shell (sidebar + topbar)
    dashboard/           today summary, stats, recent activity
    chat/                assistant UI + client (intent-routed)
    tasks/               full CRUD
    notes/               search + edit
    memory/              structured long-term memory
    automations/         workflow list + manual run
    settings/            env status, auth, provider, usage telemetry
  api/                   route handlers for every resource
  sign-in/ sign-up/      Clerk-backed (only rendered when keys exist)
  layout.tsx             root layout; conditionally mounts <ClerkProvider>
  page.tsx               redirects to /dashboard
components/
  sidebar.tsx, topbar.tsx
  ui/                    Card, Button, Input, Textarea, Badge
lib/
  db.ts                  Prisma singleton (driver adapter for SQLite)
  auth.ts                getCurrentUser() — Clerk-optional
  utils.ts               cn, date helpers, deterministic relevance scorer
  tools/index.ts         deterministic action layer (zod-validated)
  ai/index.ts            provider-agnostic generate() + local fallback
  ai/router.ts           intent router + help text
prisma/
  schema.prisma          User, Chat, Message, Task, Note, Memory,
                         Workflow, WorkflowRun, UsageEvent
proxy.ts                 edge protection (Next 16's renamed middleware)
```

---

## Token-efficiency guarantees

Everything that can be deterministic, is. The UI calls tools directly via REST
routes, and the assistant page runs the intent router *before* even
considering a model:

- `help`, `hi`, `thanks` → static local reply
- `add task: …`, `list tasks` → DB only
- `save note: … - …`, `find notes …` → DB only
- `remember: key: value` → DB only
- anything else → **tiny prompt** with:
  - at most `AI_MAX_HISTORY_MESSAGES` recent turns
  - at most `AI_MAX_MEMORY_ITEMS` retrieved memory items
  - the chat's rolling 600-char summary
  - size class `small` by default (Haiku / gpt-4o-mini)

If no provider key is set, the assistant replies locally instead of failing.
The `/settings` page shows your total token usage, recent model calls, and
provider status.

---

## Adding Clerk

1. Create an app at <https://dashboard.clerk.com>.
2. Copy the publishable + secret keys into `.env`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   ```
3. Restart `npm run dev`. The `dev mode` badge disappears, `proxy.ts`
   activates protection, and `/sign-in` / `/sign-up` render the Clerk UI.

No code changes needed — everything is gated behind the presence of those
two env vars.

---

## Adding an AI provider

Set one (or both) of:

```env
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
```

The default provider is Anthropic (Haiku for the small class). Override:

```env
AI_DEFAULT_PROVIDER="openai"
AI_DEFAULT_MODEL="gpt-4o-mini"
```

The AI layer is a thin `generate({ size, system, messages })` function in
`lib/ai/index.ts`. Swap or extend providers there.

---

## Database (Postgres via Neon)

The app uses Postgres through [Neon](https://neon.tech)'s serverless HTTP
driver. Same URL works locally and on Vercel.

1. Sign up at <https://console.neon.tech> (free forever tier).
2. Copy the **Pooled connection** string from your project dashboard.
3. Paste it into `.env`:
   ```env
   DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require"
   ```
4. `npx prisma migrate dev --name init` — creates the schema in your Neon DB.

Vercel Postgres is Neon under the hood, so the same adapter and URL format
work if you'd rather provision the DB from the Vercel dashboard.

---

## Deploying to Vercel

1. Push to GitHub.
2. Import the repo on <https://vercel.com/new>.
3. Set env vars (same as `.env.example`):
   - `DATABASE_URL` — your Neon pooled connection string.
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — from Clerk dashboard.
   - `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY` — optional.
4. Deploy. `npm run build` already passes. The build step runs
   `prisma generate` via a `postinstall` hook, so no extra CI config is needed.

For a **zero-auth preview deploy**, skip Clerk keys and the dev fallback user
stays active — useful for internal previews, not public exposure.

---

## Apple-ecosystem readiness

Nothing Apple-specific in the MVP, but the app is structured to make future
additions cheap:

- Clerk → flip on "Sign in with Apple" once keys are configured.
- `lib/tools/index.ts` is a pure tool layer — an iOS/macOS companion can
  reuse it over a thin REST wrapper (already present).
- Push notifications, widgets, and Shortcuts hooks attach cleanly to
  `/api/workflows/[id]/run`.

---

## Security

- No secrets in code. All secrets live in `.env` / Vercel env vars.
- `.env` is gitignored; `.env.example` is the committed template.
- Clerk's middleware (via `proxy.ts`) protects every route except
  `/sign-in`, `/sign-up`, and `/api/health` when enabled.
- `lib/auth.ts` scopes every query to the current user's id — pass it into
  every tool function, never trust client-supplied user ids.

---

## Scripts

```bash
npm run dev      # Next.js dev (Turbopack)
npm run build    # production build + type check
npm run start    # run the built output
npx prisma studio    # browse the local SQLite database
npx prisma migrate dev --name <name>   # new migration
```

---

## What's next (phase 2+)

- [ ] Wire real steps in `/api/workflows/[id]/run` (or proxy to a local n8n).
- [ ] Voice: whisper.cpp for STT + Piper for TTS, gated by a feature flag.
- [ ] Native Apple client consuming the existing REST surface.
- [ ] Streamed chat responses (`generate` already returns text; promote to
      `ReadableStream` when a provider is attached).
- [ ] Per-chat memory summaries generated on a schedule, not per-turn.
