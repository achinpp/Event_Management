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

-- Seed registration so the chat link works before Phase 5.
insert into public.registrations (event_id, full_name, email)
select id, 'Demo Attendee', 'demo@example.com' from public.events
where title = 'TechFusion 2026';
