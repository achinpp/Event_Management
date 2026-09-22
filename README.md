# EventPilot

AI event-marketing platform. Describe an event in plain text and EventPilot
plans the whole social campaign, generates the posts, schedules them to social
media, and runs an RSVP chatbot that answers guest questions from that event's
knowledge base — over the web or over WhatsApp.

Everything runs inside a single Next.js app. There is no separate backend, no
queue, and no worker process: all server logic lives in App Router route
handlers, and Buffer owns the publishing schedule.

---

## What it does

| # | Capability | Where |
|---|------------|-------|
| 1 | **Campaign planning.** One structured Gemini call turns an event description into a full campaign plan: audience, goals, key messages, tone, per-platform strategy, timeline phases, a weekly content calendar, KPIs, and a 5–7 post sequence. | `app/api/generate` |
| 2 | **Post generation.** Each planned post gets a caption, hashtags, a CTA, and a generated poster image uploaded to public Supabase Storage. | `app/api/posts/[id]/*`, `lib/gemini-agent.ts` |
| 3 | **Workspace.** Admin reviews the plan, edits captions inline, regenerates images or copy per post, and picks publish times. | `app/admin/events/[id]` |
| 4 | **Scheduling.** Posts go to Buffer as `customScheduled` posts. Auto-schedule resolves each post's relative `publishWindow` ("2 weeks before", "Event day") into a concrete datetime using platform-optimal posting hours. | `lib/buffer.ts`, `lib/schedule-utils.ts` |
| 5 | **Guest lists.** Import guests from an `.xlsx`/CSV upload, or collect them via a Google Form whose Apps Script writes straight into Supabase PostgREST. Listing is served separately by `/api/registrations`. | `app/api/events/[id]/registrations`, `appsscript/register.gs` |
| 6 | **RAG chatbot + RSVP.** Every registration gets a private `/chat/<token>` link. The bot answers only from that event's embedded chunks and flips the RSVP through a `confirmAttendance` tool call. | `app/api/chat` |
| 7 | **WhatsApp outreach.** A local WhatsApp client sends invites and relays replies into the same RAG + RSVP logic, so guests can confirm without ever opening a link. | `whatsapp-bot.js`, `app/api/whatsapp/webhook` |
| 8 | **Live dashboard.** Registration table polls every 2s via SWR, showing RSVP status as it changes. | `app/api/registrations` |

---

## Tech stack

### Application

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 16** (App Router, React 19, TypeScript 5) |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`) |
| Client data | **SWR** — 2s polling for dashboard liveness |
| Validation | **Zod 4** — request bodies and all AI structured output |
| Output mode | `output: "standalone"` for container deploys |

### AI

| Purpose | Model / library |
|---------|-----------------|
| Orchestration | **Vercel AI SDK 6** (`ai`, `@ai-sdk/google`) — `generateObject`, `streamText`, `generateText`, tool calling |
| Campaign planning | `gemini-2.5-flash` via `generateObject` + Zod schema |
| Chat & WhatsApp replies | `gemini-3-flash-preview` |
| Caption regeneration | `gemini-2.5-flash` |
| Images | `gemini-2.5-flash-image` via direct REST, with a deterministic SVG poster generator as fallback |
| Embeddings | `gemini-embedding-001` at `outputDimensionality: 1536`, `RETRIEVAL_DOCUMENT` for chunks / `RETRIEVAL_QUERY` for queries |

Retrieval is pgvector cosine search through one SQL function,
`match_event_chunks(p_event_id, p_embedding, p_limit)`. Event isolation is
enforced by the function signature — the event id is a required argument, not
a prompt instruction. Only `supabase/schema.sql` creates the HNSW index on
`event_chunks.embedding`; `full-setup.sql` does not, so add it there if your
chunk count grows enough for sequential scans to hurt.

### Data & integrations

| Layer | Choice |
|-------|--------|
| Database | **Supabase Postgres** + **pgvector** |
| Storage | Supabase Storage, public `posts` bucket (Buffer fetches media by URL) |
| Auth | **Supabase Auth** (email + password) via the service-role admin API; session token in an `ep_session` cookie, enforced by `proxy.ts` on `/admin/*` |
| Publishing | **Buffer GraphQL API** (`https://api.buffer.com`) |
| Registration intake | Google Forms + Apps Script → Supabase PostgREST; or `.xlsx`/CSV upload parsed in the browser with **SheetJS**, posted as JSON rows |
| Messaging | **whatsapp-web.js** + Puppeteer, QR-linked, `qrcode-terminal` for pairing |

### Deploy

| Layer | Choice |
|-------|--------|
| Target | Vercel, or any Docker host (`Dockerfile` + `docker-compose.yml`, Node 20 Alpine, standalone build) |
| Invite cron | `GET/POST /api/cron/send-invites?token=<ADMIN_PASSWORD>` — call from Vercel Cron or any external scheduler |

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Database

Open the Supabase SQL editor and run:

```
supabase/full-setup.sql     # tables, pgvector, match_event_chunks, RLS policies
supabase/seed-demo.sql      # optional: demo events and registrations
```

`supabase/schema.sql` is the original MVP schema and `supabase/migrate-*.sql`
are incremental migrations; `full-setup.sql` is the current consolidated setup
and is the one to run on a fresh project.

Note that `full-setup.sql` declares `events.user_id` as `NOT NULL` while
`seed-demo.sql` inserts events without one, so seed the demo data with a real
`user_id` (sign up first, then use that auth user's id) rather than running the
seed script unmodified.

Create a public Storage bucket named **`posts`** if the script did not create
it. It must be public — Buffer's servers fetch post media by URL, so signed or
base64 URLs will fail.

### 3. Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=        # Supabase → Settings → API
SUPABASE_SERVICE_ROLE_KEY=       # same page — SERVER ONLY, never NEXT_PUBLIC_*
GOOGLE_GENERATIVE_AI_API_KEY=    # aistudio.google.com
BUFFER_API_KEY=                  # developers.buffer.com
BUFFER_CHANNEL_ID=               # optional — resolved via listChannels() when unset
ADMIN_PASSWORD=                  # also the bearer token for the cron route
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEMO_MODE=false                  # true = fixtures, zero AI calls
```

### 4. Run

```bash
npm run dev        # http://localhost:3000
```

Sign up at `/signup`, then create your first event at `/admin`.

### 5. WhatsApp bot (optional)

Run alongside the dev server, in its own terminal:

```bash
node whatsapp-bot.js
```

Scan the printed QR code from **WhatsApp → Linked Devices**. Incoming messages
are forwarded to `/api/whatsapp/webhook`. If Next.js bound to a port other than
3000, match it:

```bash
APP_PORT=3001 node whatsapp-bot.js
```

---

## Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm start            # serve the production build
npm run lint         # eslint
npx tsc --noEmit     # typecheck
```

Docker:

```bash
docker compose up --build    # reads .env.local, serves on :3000
```

---

## Project layout

```
app/
  admin/                              # event list, workspace, registrations dashboard
  chat/[token]/                       # attendee chat (client component)
  login/  signup/                     # Supabase Auth screens
  api/
    auth/{signup,signin,signout,me}/  # session cookie lifecycle
    events/                           # CRUD; POST also chunks + embeds the description
    events/[id]/auto-schedule/        # resolve publish windows → Buffer, whole campaign
    events/[id]/registrations/        # add, patch, delete, bulk upload, outreach
    events/[id]/save-all-pairs/       # bulk-persist image/caption pairings
    generate/                         # campaign plan (maxDuration 300, nodejs runtime)
    posts/[id]/generate-image/        # per-post image generation
    posts/[id]/regenerate-caption/    # per-post copy regeneration
    chat/                             # RAG chat + confirmAttendance tool
    whatsapp/webhook/                 # inbound WhatsApp → same RAG + RSVP logic
    schedule/                         # single post → Buffer
    registrations/                    # polled by the dashboard every 2s
    cron/send-invites/                # token-gated invite dispatcher
lib/
  supabase.ts        # service-role client factory (server-only)
  auth.ts            # ep_session cookie → Supabase user
  embeddings.ts      # 1536-dim embed helpers with task types
  gemini-image.ts    # image REST call + SVG poster fallback
  gemini-agent.ts    # generate image → upload to posts bucket → public URL
  buffer.ts          # GraphQL listChannels + createPost
  schedule-utils.ts  # "2 weeks before" → ISO datetime, platform-aware hours
  demo.ts            # DEMO_MODE fixtures
proxy.ts             # auth gate on /admin/*
supabase/            # schema, migrations, seed
appsscript/          # Google Form → Supabase bridge (paste into the form)
whatsapp-bot.js      # standalone WhatsApp client
```

---

## Notes and gotchas

- **The service-role key is server-only.** It appears in route handlers and
  `lib/supabase.ts` and must never reach a client component or a
  `NEXT_PUBLIC_*` variable. All database access goes through server routes.
- **Dashboard liveness is SWR polling, not Supabase Realtime.** `postgres_changes`
  is evaluated per subscriber under RLS, so a browser subscriber would not
  reliably receive these updates.
- **Chat storage differs by channel.** The web chat at `/api/chat` never
  persists message bodies — conversation state lives in React state and is
  resent with each request. The WhatsApp webhook *does* persist history to
  `public.chat_messages`, because a phone conversation has no client-side state
  to carry. Worth knowing before presenting the web chat's no-storage guarantee.
- **`DEMO_MODE=true`** returns seeded fixtures and demo images with zero AI
  calls — useful against rate limits and unreliable conference wifi.
- **Buffer channels must not require approval.** With "Requires Approval"
  enabled on the channel, API posts land as drafts instead of entering the
  queue.
- **Image generation may fall back.** If the Gemini image model is rate-limited
  or unavailable on your key, `lib/gemini-image.ts` renders a themed SVG poster
  (compositing the event logo when one was uploaded) rather than failing the
  campaign.
- **RLS is permissive in `full-setup.sql`.** The consolidated script creates
  `USING (true)` policies. Tighten these before any untrusted multi-tenant use;
  `supabase/rls-policies.sql` is the stricter starting point.

---

## License

See [LICENSE](LICENSE).
