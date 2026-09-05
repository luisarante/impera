-- ============================================================================
-- 018 — Sincronização automática de partidas/stats da EA Pro Clubs
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
--
-- A EA só expõe as ~10 partidas mais recentes do clube, sem gol-a-gol (minuto/
-- assistência vinculada) — só estatísticas agregadas por jogador por partida
-- (gols, assistências, rating, defesas, posição, craque da partida). Por isso:
--   • `matches`/`game_nights` ganham colunas de vínculo com a EA (dedup).
--   • `match_player_stats` guarda as estatísticas agregadas por partida da EA,
--     em paralelo a `match_goals` (que continua servindo partidas manuais).
--   • `ea_player_map` liga a persona da EA a um jogador do elenco (`players`),
--     resolvida em tempo de leitura — nunca desnormalizada — para que mapear
--     uma persona depois já corrija todo o histórico sem reprocessar nada.
--   • `ea_sync_runs` é o log da rotina — só a service role (job) acessa.
-- ============================================================================

alter table public.matches
  add column if not exists ea_match_id text unique,
  add column if not exists ea_match_type text; -- 'leagueMatch' | 'playoffMatch'

alter table public.game_nights
  add column if not exists ea_night_key text unique; -- 'ea-2026-09-04', só setado pelo sync

create table if not exists public.match_player_stats (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null references public.matches(id) on delete cascade,
  ea_player_id    text not null,
  ea_persona_name text not null,
  goals           int not null default 0,
  assists         int not null default 0,
  rating          numeric(4,1),
  saves           int,
  position        text,
  is_motm         boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (match_id, ea_player_id)
);
create index if not exists match_player_stats_match_idx on public.match_player_stats (match_id);

create table if not exists public.ea_player_map (
  ea_player_id    text primary key,
  ea_persona_name text not null,
  player_id       text references public.players(id) on delete set null,
  updated_at      timestamptz not null default now()
);

create table if not exists public.ea_sync_runs (
  id           uuid primary key default gen_random_uuid(),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  ok           boolean,
  matches_seen int,
  matches_new  int,
  error        text
);

-- RLS ------------------------------------------------------------------------
-- match_player_stats / ea_player_map: leitura pública (o front-end lê com a
-- anon key), escrita só de admin (mapeamento manual) ou service role (o job
-- de sync sempre bypassa RLS).
alter table public.match_player_stats enable row level security;
drop policy if exists "match_player_stats_read_all" on public.match_player_stats;
create policy "match_player_stats_read_all" on public.match_player_stats
  for select using (true);

alter table public.ea_player_map enable row level security;
drop policy if exists "ea_player_map_read_all" on public.ea_player_map;
create policy "ea_player_map_read_all" on public.ea_player_map
  for select using (true);
drop policy if exists "ea_player_map_write_auth" on public.ea_player_map;
create policy "ea_player_map_write_auth" on public.ea_player_map
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ea_sync_runs: sem policy nenhuma de select/insert/update — só a service role
-- (chave usada pelo job) acessa; nem admin logado consegue ler via anon/authenticated.
alter table public.ea_sync_runs enable row level security;
