-- Fix Row-Level Security (RLS) policies for EventPilot tables
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yxbwydpmcbwkxygcfixn/sql/new

-- ----------------------------------------------------
-- 1. REGISTRATIONS TABLE
-- ----------------------------------------------------
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public registration insert" ON public.registrations;
DROP POLICY IF EXISTS "Allow event owners to view registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow event owners to manage registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow full access for authenticated users" ON public.registrations;
DROP POLICY IF EXISTS "Allow public access for registrations" ON public.registrations;

-- Allow public (anon & authenticated) to insert registrations (guest signups)
CREATE POLICY "Allow public registration insert"
ON public.registrations FOR INSERT
TO public
WITH CHECK (true);

-- Allow public to select registrations (for landing page/chat verification)
CREATE POLICY "Allow public registration select"
ON public.registrations FOR SELECT
TO public
USING (true);

-- Allow authenticated users to update/delete registrations
CREATE POLICY "Allow authenticated registration update"
ON public.registrations FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated registration delete"
ON public.registrations FOR DELETE
TO authenticated
USING (true);

-- ----------------------------------------------------
-- 2. EVENTS TABLE
-- ----------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own events" ON public.events;
DROP POLICY IF EXISTS "Users can view their own events" ON public.events;
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
DROP POLICY IF EXISTS "Allow public read access to events" ON public.events;

CREATE POLICY "Users can insert their own events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own events"
ON public.events FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow public read access to events"
ON public.events FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can update their own events"
ON public.events FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
ON public.events FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ----------------------------------------------------
-- 3. GENERATED POSTS TABLE
-- ----------------------------------------------------
ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to generated_posts" ON public.generated_posts;

CREATE POLICY "Allow public access to generated_posts"
ON public.generated_posts FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- ----------------------------------------------------
-- 4. CHAT MESSAGES TABLE
-- ----------------------------------------------------
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to chat_messages" ON public.chat_messages;

CREATE POLICY "Allow public access to chat_messages"
ON public.chat_messages FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- ----------------------------------------------------
-- 5. EVENT CHUNKS TABLE
-- ----------------------------------------------------
ALTER TABLE public.event_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to event_chunks" ON public.event_chunks;

CREATE POLICY "Allow public access to event_chunks"
ON public.event_chunks FOR ALL
TO public
USING (true)
WITH CHECK (true);
