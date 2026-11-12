-- Run in Supabase SQL Editor. Authentication is handled by Supabase Auth.
create table if not exists public.user_progress (
 user_id uuid primary key references auth.users(id) on delete cascade,
 puntos integer not null default 0 check (puntos >= 0),
 completados jsonb not null default '{}'::jsonb,
 personaje text not null default '🍃',
 nombre text not null default 'Hojita',
 updated_at timestamptz not null default now()
);
alter table public.user_progress enable row level security;
create policy "Read own progress" on public.user_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own progress" on public.user_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own progress" on public.user_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- IMPORTANT: Clients can currently submit their own points. Do not use these
-- values for prizes or a trusted global leaderboard. Move point awards to
-- server-side validated events before enabling competitive rankings.
