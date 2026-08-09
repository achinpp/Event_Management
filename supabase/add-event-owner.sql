-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/yxbwydpmcbwkxygcfixn/sql/new

-- Add owner field to events table referencing auth.users.
-- Since the database has been cleared of legacy data, we can add it as NOT NULL.
ALTER TABLE public.events 
ADD COLUMN user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
