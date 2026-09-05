-- ============================================================================
-- 021 — Histórico de evolução do clube (EA)
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
--
-- `ea_club_stats` (migração 019) guarda só o SNAPSHOT atual — cada sync
-- sobrescreve. Esta tabela guarda um HISTÓRICO: a sincronização (ver
-- syncClubSummary em api/_eaSync.js) insere uma linha nova só quando algum
-- número relevante muda (evita crescer sem necessidade em rodadas sem jogo
-- novo) — alimenta o gráfico de evolução em /estatisticas.
-- ============================================================================

create table if not exists public.ea_club_stats_history (
  id             uuid primary key default gen_random_uuid(),
  club_id        text not null,
  recorded_at    timestamptz not null default now(),
  skill_rating   int,
  wins           int,
  losses         int,
  ties           int,
  goals          int,
  goals_against  int,
  best_division  int
);
create index if not exists ea_club_stats_history_club_idx
  on public.ea_club_stats_history (club_id, recorded_at);

alter table public.ea_club_stats_history enable row level security;
drop policy if exists "ea_club_stats_history_read_all" on public.ea_club_stats_history;
create policy "ea_club_stats_history_read_all" on public.ea_club_stats_history
  for select using (true);

-- Escrita só via service role (o script local de sync).
