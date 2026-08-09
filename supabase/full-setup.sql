-- =============================================================
-- COMPLETE SUPABASE DATABASE SETUP & RLS POLICIES FOR EVENTPILOT
-- Run this entire script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yxbwydpmcbwkxygcfixn/sql/new
-- =============================================================

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  starts_at     timestamptz,
  venue         text,
  contact_name  text,
  contact_email text,
  contact_phone text,
  breakdown     jsonb DEFAULT '[]'::jsonb,
  logo_url      text,
  status        text NOT NULL DEFAULT 'draft',
  invite_lead_days int NOT NULL DEFAULT 7,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Ensure user_id column exists if events was created before
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS invite_lead_days int NOT NULL DEFAULT 7;

-- 2. GENERATED POSTS TABLE
CREATE TABLE IF NOT EXISTS public.generated_posts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  variant_index  smallint NOT NULL,
  image_url      text,
  caption        text,
  hashtags       text[] DEFAULT '{}',
  final_caption  text,
  status         text NOT NULL DEFAULT 'draft',
  scheduled_at   timestamptz,
  buffer_post_id text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, variant_index)
);

-- 3. REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.registrations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid REFERENCES public.events (id) ON DELETE CASCADE,
  full_name        text,
  email            text,
  phone            text,
  extra            jsonb DEFAULT '{}'::jsonb,
  rsvp_status      text NOT NULL DEFAULT 'pending',
  rsvp_at          timestamptz,
  chat_token       text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  form_response_id text,
  invite_sent_at   timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS invite_sent_at timestamptz;

-- 4. CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.registrations (id) ON DELETE CASCADE,
  role            text NOT NULL,
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 5. EVENT CHUNKS TABLE (AI Vector RAG)
CREATE TABLE IF NOT EXISTS public.event_chunks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  content    text NOT NULL,
  embedding  vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Match function for RAG vector search
CREATE OR REPLACE FUNCTION public.match_event_chunks(
  p_event_id uuid, p_embedding vector(1536), p_limit int DEFAULT 5
) RETURNS TABLE (content text, similarity real)
LANGUAGE sql STABLE AS $$
  SELECT c.content, (1 - (c.embedding <=> p_embedding))::real
  FROM public.event_chunks c
  WHERE c.event_id = p_event_id AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> p_embedding
  LIMIT p_limit;
$$;

-- -------------------------------------------------------------
-- DISABLE RLS OR ADD PERMISSIVE POLICIES TO PREVENT RLS ERRORS
-- -------------------------------------------------------------

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all events" ON public.events;
CREATE POLICY "Allow all events" ON public.events FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all generated_posts" ON public.generated_posts;
CREATE POLICY "Allow all generated_posts" ON public.generated_posts FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all registrations" ON public.registrations;
CREATE POLICY "Allow all registrations" ON public.registrations FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all chat_messages" ON public.chat_messages;
CREATE POLICY "Allow all chat_messages" ON public.chat_messages FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.event_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all event_chunks" ON public.event_chunks;
CREATE POLICY "Allow all event_chunks" ON public.event_chunks FOR ALL TO public USING (true) WITH CHECK (true);
