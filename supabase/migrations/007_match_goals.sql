-- ============================================================================
-- 007 — Gols do Imperatrice por partida (autores)
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
-- Uma linha por gol marcado por jogador do elenco. Gols de bots não entram.
-- ============================================================================

create table if not exists public.match_goals (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches(id) on delete cascade,
  player_id  text not null references public.players(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists match_goals_match_idx on public.match_goals (match_id, sort_order);

alter table public.match_goals enable row level security;

drop policy if exists "match_goals_read_all" on public.match_goals;
create policy "match_goals_read_all" on public.match_goals
  for select using (true);

drop policy if exists "match_goals_write_auth" on public.match_goals;
create policy "match_goals_write_auth" on public.match_goals
  for all to authenticated using (true) with check (true);
