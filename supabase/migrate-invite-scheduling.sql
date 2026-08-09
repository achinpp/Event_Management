-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard)
-- to add the invite_sent_at and invite_lead_days columns:

-- Add invite_lead_days to events (default is 7 days before event starts)
alter table public.events add column if not exists invite_lead_days int not null default 7;

-- Add invite_sent_at to registrations to track invitation dispatches
alter table public.registrations add column if not exists invite_sent_at timestamptz;
