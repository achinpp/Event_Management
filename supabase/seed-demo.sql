-- Phase 6 demo seed: 2 more events + 20 registrations across RSVP states.
-- Idempotent: events guarded by title, registrations by form_response_id.
-- After running, hit GET /api/events once — it chunks + embeds any event
-- that has no event_chunks rows yet.

insert into public.events (title, description, starts_at, venue, contact_name, contact_email, contact_phone, status)
select * from (values
  (
    'Colombo Design Week 2026',
    E'Five days of talks, exhibitions, and studio tours celebrating Sri Lankan design — from architecture and interiors to digital product design.\n\nHeadline speakers include designers from Tokyo, Berlin, and Bengaluru. Each evening ends with an open-air networking session on the rooftop of the venue.\n\nTickets are LKR 2,500 per day or LKR 9,000 for a full-festival pass. Students get 50% off with a valid ID. All exhibitions are wheelchair accessible. Food trucks on site daily from noon.',
    now() + interval '45 days',
    'Port City Convention Centre, Colombo',
    'Nadia Perera',
    'hello@colombodesignweek.example',
    '+94 77 123 4567',
    'draft'
  ),
  (
    'Kandy Startup Weekend',
    E'54 hours to go from idea to pitch. Form a team on Friday night, build through Saturday, and demo to a judging panel of founders and investors on Sunday evening.\n\nMentors from Colombo and Singapore tech companies will circulate all weekend. Prizes include LKR 500,000 in cloud credits, incubator interviews, and a fast-track to the national startup showcase.\n\nEntry is free but capped at 100 participants. Meals, coffee, and workspace included. Bring your own laptop. Doors open Friday 5:30 PM.',
    now() + interval '21 days',
    'Kandy City Centre Innovation Hub',
    'Ruwan Silva',
    'team@kandystartupweekend.example',
    null,
    'draft'
  )
) as v(title, description, starts_at, venue, contact_name, contact_email, contact_phone, status)
where not exists (select 1 from public.events e where e.title = v.title);

-- 20 registrations spread across the three demo events and RSVP states.
with targets as (
  select
    (select id from public.events where title = 'TechFusion 2026')         as tech,
    (select id from public.events where title = 'Colombo Design Week 2026') as design,
    (select id from public.events where title = 'Kandy Startup Weekend')    as startup
)
insert into public.registrations (event_id, full_name, email, rsvp_status, rsvp_at, form_response_id)
select
  case r.ev when 'tech' then t.tech when 'design' then t.design else t.startup end,
  r.full_name, r.email, r.rsvp_status,
  case when r.rsvp_status = 'pending' then null
       else now() - (r.n || ' hours')::interval end,
  'seed-' || lpad(r.n::text, 3, '0')
from targets t,
(values
  ( 1, 'tech',    'Amara Jayasuriya',  'amara.j@example.com',    'confirmed'),
  ( 2, 'tech',    'Bimal Rathnayake',  'bimal.r@example.com',    'confirmed'),
  ( 3, 'tech',    'Chathura Fonseka',  'chathura.f@example.com', 'confirmed'),
  ( 4, 'tech',    'Dilini Weerasinghe','dilini.w@example.com',   'pending'),
  ( 5, 'tech',    'Eshan Gunawardena', 'eshan.g@example.com',    'pending'),
  ( 6, 'tech',    'Fathima Rizwan',    'fathima.r@example.com',  'declined'),
  ( 7, 'tech',    'Gayan Mendis',      'gayan.m@example.com',    'confirmed'),
  ( 8, 'tech',    'Hiruni Alwis',      'hiruni.a@example.com',   'pending'),
  ( 9, 'design',  'Isuru Bandara',     'isuru.b@example.com',    'confirmed'),
  (10, 'design',  'Janani Kulatunga',  'janani.k@example.com',   'confirmed'),
  (11, 'design',  'Kasun Peiris',      'kasun.p@example.com',    'pending'),
  (12, 'design',  'Lakshi Herath',     'lakshi.h@example.com',   'declined'),
  (13, 'design',  'Malith Dias',       'malith.d@example.com',   'confirmed'),
  (14, 'design',  'Nethmi Samaraweera','nethmi.s@example.com',   'pending'),
  (15, 'startup', 'Oshadi Wickrama',   'oshadi.w@example.com',   'confirmed'),
  (16, 'startup', 'Pasindu Ekanayake', 'pasindu.e@example.com',  'confirmed'),
  (17, 'startup', 'Rashmi Senanayake', 'rashmi.s@example.com',   'pending'),
  (18, 'startup', 'Sahan Liyanage',    'sahan.l@example.com',    'declined'),
  (19, 'startup', 'Tharushi Amarasekara','tharushi.a@example.com','confirmed'),
  (20, 'startup', 'Umesh Karunaratne', 'umesh.k@example.com',    'pending')
) as r(n, ev, full_name, email, rsvp_status)
on conflict (form_response_id) where form_response_id is not null do nothing;
