-- ============================================================================
-- 019 — Números oficiais do clube e carreira dos jogadores (EA Pro Clubs)
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
--
-- Complementa a sincronização de partidas (018): a EA também expõe um
-- resumo acumulado do clube (jogos, vitórias, promoções/rebaixamentos,
-- quantas vezes terminou em 1º em cada divisão — o "troféu" mais próximo
-- que ela dá) e a carreira de cada jogador (jogos/gols/assistências/craques
-- acumulados, não só as ~10 partidas recentes). São dados de RESUMO — cada
-- sincronização SOBRESCREVE (não acumula), diferente de match_player_stats.
-- ============================================================================

create table if not exists public.ea_club_stats (
  club_id             text primary key, -- id do clube na EA (ex.: '1716582')
  games_played        int,
  games_played_playoff int,
  wins                int,
  losses              int,
  ties                int,
  goals               int,
  goals_against       int,
  promotions          int,
  relegations         int,
  best_division       int,
  best_finish_group   int,
  skill_rating        int,
  win_streak          int,
  unbeaten_streak     int,
  league_appearances  int,
  division_finishes   jsonb, -- bruto: {"finishesInDivision5Group1": 1, ...}
  updated_at          timestamptz not null default now()
);

-- Sem vínculo direto a ea_player_id (a EA não dá um id estável aqui, só o
-- nome da persona) — resolvido em tempo de leitura via ea_player_map.ea_persona_name.
create table if not exists public.ea_member_career_stats (
  ea_persona_name    text primary key,
  games_played       int,
  goals              int,
  assists            int,
  man_of_the_match   int,
  rating_avg         numeric(4,1),
  favorite_position  text,
  updated_at         timestamptz not null default now()
);

alter table public.ea_club_stats enable row level security;
drop policy if exists "ea_club_stats_read_all" on public.ea_club_stats;
create policy "ea_club_stats_read_all" on public.ea_club_stats
  for select using (true);

alter table public.ea_member_career_stats enable row level security;
drop policy if exists "ea_member_career_stats_read_all" on public.ea_member_career_stats;
create policy "ea_member_career_stats_read_all" on public.ea_member_career_stats
  for select using (true);

-- Escrita só via service role (o script local de sync) — sem policy de
-- insert/update/delete para anon/authenticated em nenhuma das duas.
