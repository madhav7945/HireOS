# Deploying HireOS (real product)

HireOS is a Vite + React app with a Supabase backend and Vercel serverless functions
(OG link previews + the Indeed/Adzuna XML feed). With the steps below it runs as a
real, persistent product — not demo data.

> How "real vs demo" works: the whole app talks to one data layer
> (`src/services/localData.js`). When `VITE_SUPABASE_URL` points at a real project,
> every read/write goes to Postgres. When it isn't configured (local dev), it falls
> back to browser `localStorage` with seeded demo data. So a correctly configured
> deploy shows **real, empty states** — no demo rows.

## 1. Supabase

1. Create a project at https://supabase.com.
2. **SQL Editor → New query →** paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   This creates the tables (document model: `id`, `data jsonb`, `status`, `session_id`,
   timestamps), indexes, and Row Level Security policies (authenticated team = full
   access; anonymous = only what the public apply + interview pages need).
3. **Authentication → Providers → Email:** enable it. For the smoothest start, turn
   **"Confirm email" OFF** (Auth → Providers → Email) so new sign-ups are logged in
   immediately. Leave it on if you want email verification (users must confirm first).
4. **Project Settings → API:** copy the **Project URL** and the **anon public** key.

## 2. Email delivery (optional but recommended)

Outbound emails (confirmation, shortlist, interview invite/reminder, offer, decline)
go through a Supabase Edge Function + Resend.

1. Get a key at https://resend.com (free tier works).
2. Deploy the function (Supabase CLI):
   ```
   supabase functions deploy send-email
   supabase secrets set RESEND_API_KEY=your_resend_key
   ```
   File: [`supabase/functions/send-email/index.ts`](supabase/functions/send-email/index.ts).
3. Until this is set up, emails degrade to an honest no-op (logged, not delivered) —
   the rest of the pipeline still runs.

## 3. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (and in `.env`
for local dev):

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | ✅ | Supabase Project URL (enables the real backend + real auth) |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon public key |
| `VITE_PUBLIC_URL` | ✅ | Your deployed domain, e.g. `https://your-app.vercel.app` (used for share/OG + apply links) |
| `VITE_AI_API_KEY` | ⬜ | Groq/OpenAI key for AI résumé screening + the AI interviewer (falls back to a simulator without it) |
| `VITE_EMAIL_FROM` | ⬜ | From address, e.g. `HireOS <hire@yourdomain.com>` |

## 4. Deploy to Vercel

1. Import the repo into Vercel (framework auto-detected as Vite; config in
   [`vercel.json`](vercel.json)). Build: `npm run build`, output: `dist`.
2. Add the env vars from step 3 → **Deploy**.
3. The serverless functions in `api/` deploy automatically:
   - `/api/share` — server-rendered Open Graph page so LinkedIn/WhatsApp show a rich job card.
   - `/feed/jobs.xml` — Indeed/Adzuna XML feed.

## 5. First run

1. Open the deployed URL → **Create one** (sign up) → you're in.
2. Create a job, post it, and use **Distribute** to share it.
3. Candidates apply at `/apply/:jobId`; the Hiring Autopilot screens, shortlists,
   schedules the AI interview, and (after the interview) drafts an offer or sends a
   decline. Tune it under **My Actions → Hiring Autopilot**.

## Security note (production hardening)

The anonymous RLS policies let the candidate-facing pages (which have no login) drive
the automation, including writes to `offers`/`tasks`/`activity`. That's a pragmatic
trade-off so everything works without a server. To harden: move the post-interview
automation (`onInterviewComplete` in `src/services/pipeline.js`) into a Supabase Edge
Function using the **service-role** key, then tighten/remove the `anon_write_*`
policies in `supabase/schema.sql`.
