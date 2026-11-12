-- Applied to Supabase project Reuse up on 2026-11-11.
-- Supabase Auth stores passwords, not this table.
create table if not exists public.user_progress (
 user_id uuid primary key references auth.users(id) on delete cascade,
 puntos integer not null default 0 check (puntos >= 0),
 completados jsonb not null default '{}'::jsonb,
 personaje text not null default '🍃',
 nombre text not null default 'Hojita',
 updated_at timestamptz not null default now()
);
alter table public.user_progress enable row level security;
create policy "read_own_progress" on public.user_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert_own_progress" on public.user_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update_own_progress" on public.user_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant usage on schema public to authenticated;
grant select,insert,update on public.user_progress to authenticated;
-- Security note: award points on a verified server before using for prizes/leaderboards.
