@AGENTS.md

# CLAUDE.md — EventPilot MVP build

You are building EventPilot: an AI event-marketing platform. This file is the
single source of truth. When it conflicts with your instincts, this file wins.

---

## /goal

Ship a working MVP in one day, deployed on Vercel, total infra cost $0:

1. Admin creates an event from a text prompt + optional logo image.
2. One structured Gemini call breaks the event down and writes 3 image briefs
   and 3 caption briefs. Fan out: 3 images + 3 captions generated in parallel.
3. Workspace UI: admin previews, pairs image+caption, edits, schedules to
   social media through the Buffer API (Buffer is the scheduler — we never
   build cron, queues, or workers).
4. Attendees register through a Google Form. Apps Script writes each
   submission straight into Supabase (no webhook to our app).
5. Each registration gets a unique chat link `/chat/<token>`. A RAG chatbot
   answers questions using ONLY that event's knowledge base and captures the
   RSVP through a tool call. Chat messages are NEVER stored server-side.
6. Admin dashboard shows registrations with live-updating RSVP status
   (2-second polling — see /rules for why not Supabase Realtime).

---

## /stack  (locked — do not substitute)

| Layer            | Choice                                              |
|------------------|-----------------------------------------------------|
| App              | Next.js 15+ (App Router, TypeScript) — one repo, no separate backend |
| Hosting          | Vercel Hobby, Fluid Compute on (default for new projects) |
| DB/Storage       | Supabase free tier (Postgres + pgvector + Storage)  |
| AI text/chat     | Vercel AI SDK (`ai` + `@ai-sdk/google`), model `gemini-3-flash` |
| AI embeddings    | `gemini-embedding-001`, `outputDimensionality: 1536` |
| AI images        | `gemini-2.5-flash-image` via direct REST fetch (NOT the AI SDK) |
| Publishing       | Buffer GraphQL API (personal API key from developers.buffer.com) |
| Registration     | Google Forms + Apps Script → Supabase PostgREST     |
| Admin auth       | Single shared password in `ADMIN_PASSWORD` env, cookie set by middleware. NOT Supabase Auth. |

---

## /rules  (hard constraints — check before every file you write)

1. NEVER create a Python service, FastAPI app, or second deployment. All
   server logic lives in Next.js route handlers.
2. NEVER add LangChain, LangGraph, or any agent framework. Orchestration is:
   one `generateObject` call → `Promise.all` fan-out → done.
3. NEVER persist chat messages. No messages table, no logs of chat bodies,
   no LangSmith/tracing on the chat route. Conversation state lives in React
   state client-side and is sent with each request. If you find yourself
   writing `insert` with message content, stop — that violates the product's
   privacy guarantee.
4. `SUPABASE_SERVICE_ROLE_KEY` is used ONLY in server code (route handlers,
   middleware). It must never appear in a client component, never in
   `NEXT_PUBLIC_*`. All DB access goes through server routes — RLS is enabled
   with zero policies, so the anon key can read nothing, and we don't use the
   anon key at all.
5. Dashboard liveness = SWR polling every 2000ms against our own API route.
   Do NOT use Supabase Realtime client subscriptions: `postgres_changes`
   respects RLS per subscriber, and our zero-policy setup means subscribers
   receive nothing. (Optional stretch, only if all phases done: add a select
   policy and switch to Realtime.)
6. Model IDs are pinned exactly as in /stack. Do not "upgrade" the image
   model: newer Gemini 3.x image models are paid-only; `gemini-2.5-flash-image`
   is the free-tier lane (~500 req/day). If a pinned text model ID 404s,
   check https://ai.google.dev/gemini-api/docs/models and pick the closest
   free-tier flash model, then record the change at the bottom of this file.
7. Embedding calls MUST set `outputDimensionality: 1536` (the model defaults
   to 3072; the DB column is vector(1536); HNSW caps at 2000 dims — a
   mismatch fails at insert time). Use taskType RETRIEVAL_DOCUMENT for chunks
   and RETRIEVAL_QUERY for queries.
8. Do not invent Buffer endpoint URLs from memory. Before writing
   `lib/buffer.ts`, fetch and read https://developers.buffer.com quickstart +
   the Posts & Scheduling guide, and use the endpoint + auth header exactly as
   documented there. The mutation shape is `createPost(input: { text,
   channelId, schedulingType: automatic, mode: customScheduled, dueAt })` and
   image posts attach an asset per the "Create an Image Post" doc.
9. Generated images: Gemini returns base64 → decode → upload to the public
   `posts` storage bucket → store the PUBLIC URL in the DB. Buffer's servers
   fetch media by URL; a base64 blob or signed URL will fail.
10. Every route that calls Gemini for images must respect `DEMO_MODE=true`:
    skip the API and return the seeded demo image URLs instead. This is
    rate-limit and conference-wifi insurance.
11. `export const maxDuration = 300;` and `export const runtime = "nodejs";`
    on /api/generate. Other routes: defaults are fine.
12. Commit at the end of every phase with message `phase N: <summary>`.
    Do not start phase N+1 with phase N's gate unverified.

---

## /env  (create .env.local now; also add to Vercel project settings)

```
NEXT_PUBLIC_SUPABASE_URL=        # Supabase dashboard → Settings → API
SUPABASE_SERVICE_ROLE_KEY=       # same page. SERVER ONLY.
GOOGLE_GENERATIVE_AI_API_KEY=    # aistudio.google.com → Get API key
BUFFER_API_KEY=                  # developers.buffer.com → API keys
BUFFER_CHANNEL_ID=               # one channel id, fetched via Buffer API in Phase 5
ADMIN_PASSWORD=                  # anything; gate for /admin
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEMO_MODE=false
```

Ask the human for any value you don't have. Never hardcode a secret.

---

## /schema  (write this to supabase/schema.sql; human pastes it into the Supabase SQL editor)

```sql
create extension if not exists vector;

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  starts_at     timestamptz,
  venue         text,
  contact_name  text,
  contact_email text,
  contact_phone text,
  breakdown     jsonb default '[]'::jsonb,   -- orchestrator output, schemaless on purpose
  logo_url      text,
  status        text not null default 'draft',
  created_at    timestamptz not null default now()
);

create table public.generated_posts (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events (id) on delete cascade,
  variant_index  smallint not null,
  image_url      text,
  caption        text,
  hashtags       text[] default '{}',
  final_caption  text,
  status         text not null default 'draft',  -- draft | scheduled | published
  scheduled_at   timestamptz,
  buffer_post_id text,
  created_at     timestamptz not null default now(),
  unique (event_id, variant_index)
);

create table public.registrations (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid references public.events (id) on delete cascade,
  full_name        text,
  email            text,
  phone            text,
  extra            jsonb default '{}'::jsonb,
  rsvp_status      text not null default 'pending',  -- pending | confirmed | declined
  rsvp_at          timestamptz,
  chat_token       text not null default replace(gen_random_uuid()::text, '-', ''),
  form_response_id text,
  created_at       timestamptz not null default now()
);

create unique index registrations_chat_token_idx on public.registrations (chat_token);
create unique index registrations_form_response_idx
  on public.registrations (form_response_id) where form_response_id is not null;
create index registrations_event_idx on public.registrations (event_id, rsvp_status);

create table public.event_chunks (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  content    text not null,
  embedding  vector(1536),
  created_at timestamptz not null default now()
);

create index event_chunks_event_idx on public.event_chunks (event_id);
create index event_chunks_embedding_idx
  on public.event_chunks using hnsw (embedding vector_cosine_ops);

-- Only retrieval path. event_id is a required argument: isolation is enforced
-- by the function signature, not the prompt.
create or replace function public.match_event_chunks(
  p_event_id uuid, p_embedding vector(1536), p_limit int default 5
) returns table (content text, similarity real)
language sql stable as $$
  select c.content, (1 - (c.embedding <=> p_embedding))::real
  from public.event_chunks c
  where c.event_id = p_event_id and c.embedding is not null
  order by c.embedding <=> p_embedding
  limit p_limit;
$$;

-- RLS on, zero policies: only service_role gets through. Intentional.
alter table public.events          enable row level security;
alter table public.generated_posts enable row level security;
alter table public.registrations   enable row level security;
alter table public.event_chunks    enable row level security;

-- Public bucket for generated post images (Buffer fetches these by URL).
insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do nothing;

-- Seed so the UI has data at every phase.
insert into public.events (title, description, starts_at, venue, contact_name, contact_email)
values (
  'TechFusion 2026',
  'A one-day AI and robotics summit featuring 12 speakers, 4 workshops, and a startup showcase. Free entry for students. Lunch and refreshments provided. Parking available on site. Doors open 8:30 AM.',
  now() + interval '30 days',
  'Cinnamon Grand, Colombo',
  'Priya Fernando',
  'hello@techfusion.example'
);
```

---

## /architecture  (target file map — keep it this small)

```
app/
  admin/page.tsx                    # event list + "new event" form
  admin/events/[id]/page.tsx        # workspace: variants grid, pair/edit/schedule, registrations table
  chat/[token]/page.tsx             # attendee chat (client component, messages in React state)
  api/events/route.ts               # GET list, POST create (create also chunks + embeds description)
  api/events/[id]/route.ts          # GET one (event + posts + registrations)
  api/generate/route.ts             # POST { eventId } → breakdown + 3 images + 3 captions
  api/chat/route.ts                 # POST { token, messages } → streamText + confirmAttendance tool
  api/schedule/route.ts             # POST { postId, dueAt } → Buffer createPost
  api/registrations/route.ts        # GET ?eventId= (dashboard polls this every 2s)
middleware.ts                       # password-gate everything under /admin
lib/supabase.ts                     # service-role client factory (server-only import)
lib/gemini-image.ts                 # REST call to gemini-2.5-flash-image (+ logo as inlineData), returns base64
lib/embeddings.ts                   # embed helpers, outputDimensionality: 1536, task types
lib/buffer.ts                       # GraphQL createPost + listChannels
lib/demo.ts                         # DEMO_MODE fixtures
supabase/schema.sql
appsscript/register.gs              # for the human to paste into the Google Form
```

Request flows to preserve exactly:

- generate: insert placeholder rows → `generateObject` (breakdown + 3 image
  briefs + 3 caption briefs, zod schema) → `Promise.all` of 3 image REST calls
  + 3 caption calls → upload images to `posts` bucket → update rows →
  return. UI shows skeletons while polling the event route.
- chat: resolve token → registration + event (service role) → embed query
  (RETRIEVAL_QUERY) → `match_event_chunks(event_id, …)` → `streamText` with
  system prompt = event facts + retrieved chunks + contact info, tools =
  `{ confirmAttendance: { status: 'confirmed' | 'declined' } }` → on tool
  call, update `rsvp_status` + `rsvp_at`, return friendly confirmation.
  If the user asks for a human: answer with `contact_name/email/phone`
  from the event row (already in the system prompt — no tool needed).
- schedule: read post + its public image_url → Buffer createPost with
  `customScheduled` + `dueAt` → store `buffer_post_id`, status='scheduled'.

---

## /phases  (build in this order; each gate must pass before the next phase)

### Phase 0 — foundations
Scaffold Next.js (TS, App Router, Tailwind). Install: `ai @ai-sdk/google
@supabase/supabase-js zod swr`. Write `supabase/schema.sql`, `.env.local`
template, `lib/supabase.ts`, `middleware.ts`.
**Human tasks (print these clearly and wait):** create Supabase project,
paste schema.sql in SQL editor, fill `.env.local`.
**Gate:** `curl localhost:3000/api/events` returns the seeded TechFusion event.

### Phase 1 — events + embedding pipeline
POST /api/events creates an event, splits its description into paragraph
chunks, embeds them in one `embedMany`-style batch, inserts into event_chunks.
Backfill the seed event's chunks on first GET if missing.
**Gate:** creating an event via curl yields >0 rows in event_chunks with
non-null embeddings.

### Phase 2 — generation pipeline (headless)
/api/generate end to end, DEMO_MODE respected, maxDuration 300.
**Gate:** `curl -X POST /api/generate -d '{"eventId":"…"}'` results in 3
generated_posts rows whose image_url each load in a browser.

### Phase 3 — workspace UI
Admin list + workspace. Variant grid (3 images × 3 captions), select a pair,
edit caption inline (writes final_caption), datetime picker + Schedule button
(wired in phase 5 — stub it now to just save scheduled_at).
**Gate:** human can visually pair and edit and see it persist on refresh.

### Phase 4 — RAG chat + RSVP
/chat/[token] + /api/chat exactly per /architecture. On confirmAttendance,
the UI shows a clear success state.
**Gate:** open the seed registration's chat link; ask "is parking available?"
→ answer grounded in the event description; say "I'll be there" → row in
registrations flips to confirmed with rsvp_at set. Second gate: ask about a
different (newly created) event's details in this chat → the bot does NOT
know them (isolation proof — demo this to judges).

### Phase 5 — registrations in + posts out
(a) Write appsscript/register.gs: onFormSubmit → UrlFetchApp.fetch to
`<SUPABASE_URL>/rest/v1/registrations` with apikey + Bearer service key
headers, Prefer: return=minimal, body {event_id, full_name, email,
form_response_id: e.response.getId()}. Print human setup steps (create form,
paste script, installable trigger).
(b) lib/buffer.ts (read the docs first — /rules #8), wire the Schedule
button, fetch BUFFER_CHANNEL_ID via a listChannels call if unset.
(c) /api/registrations + SWR polling table with copy-chat-link buttons.
**Gate:** live form submission appears on the dashboard within 2s without a
refresh; scheduling a post makes it appear in the Buffer dashboard queue.
Warn the human: the Buffer channel must NOT have "Requires Approval" enabled,
or API posts land as drafts.

### Phase 6 — demo hardening + deploy
Seed script: 2 more events, 20 registrations across RSVP states. DEMO_MODE
fixtures: copy the best 3 generated images into /public/demo and wire
lib/demo.ts. Deploy: push to GitHub, import to Vercel, set env vars, set
NEXT_PUBLIC_APP_URL to the prod URL, confirm Fluid Compute is on.
**Gate:** full demo run on the PRODUCTION url: create event → generate →
pair → schedule → register via real form → chat → confirm → dashboard flips.

---

## /commands

```bash
# setup
npx create-next-app@latest . --typescript --app --tailwind --eslint --no-src-dir
npm i ai @ai-sdk/google @supabase/supabase-js zod swr

# dev loop
npm run dev
npx tsc --noEmit            # run before every phase commit
npm run build               # must pass before phase 6 deploy

# quick checks
curl -s localhost:3000/api/events | jq
curl -s -X POST localhost:3000/api/generate -H 'content-type: application/json' -d '{"eventId":"<id>"}'
```

---

## /verify  (run whenever asked to "verify"; print a pass/fail table)

1. `grep -R "SERVICE_ROLE" app components lib --include=*.tsx -l` inside any
   client component → must be empty.
2. `grep -Rn "createClient" app | grep -v server` → no anon-key browser client exists.
3. No table or insert anywhere containing chat message bodies.
4. /api/generate has `maxDuration = 300` and `runtime = "nodejs"`.
5. Embedding calls set outputDimensionality 1536 and task types.
6. Image model string is exactly `gemini-2.5-flash-image`.
7. `posts` bucket is public; a generated image_url opens logged-out.
8. DEMO_MODE=true generate round-trips with zero Gemini calls.
9. Buffer code matches the live docs, not guessed URLs.
10. `npx tsc --noEmit` and `npm run build` pass.

---

## /decisions-log

(append model-ID or endpoint changes here with date + reason)
