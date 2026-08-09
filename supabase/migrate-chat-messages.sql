-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard)
-- to create the chat_messages table and enable RLS:

create table if not exists public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  role            text not null, -- 'user' | 'assistant'
  content         text not null,
  created_at      timestamptz not null default now()
);

create index if not exists chat_messages_reg_idx on public.chat_messages (registration_id, created_at asc);

-- Enable Row Level Security (RLS)
alter table public.chat_messages enable row level security;
