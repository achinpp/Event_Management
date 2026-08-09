-- Migration to add Penpot design file references to generated_posts
alter table public.generated_posts 
  add column if not exists penpot_file_id text,
  add column if not exists penpot_url text;
