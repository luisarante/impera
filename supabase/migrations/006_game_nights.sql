-- ============================================================================
-- 006 — Noites de jogo: partidas, craque da noite e eventos
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
-- ============================================================================

-- Noite de jogo (rodada) ------------------------------------------------------
create table if not exists public.game_nights (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  date       date not null default current_date,
  subtitle   text,
  mvp_open   boolean not null default true,   -- votação de craque aberta?
  created_at timestamptz not null default now()
);
create index if not exists game_nights_date_idx on public.game_nights (date desc, created_at desc);

-- Partidas da noite -----------------------------------------------------------
create table if not exists public.matches (
  id          uuid primary key default gen_random_uuid(),
  night_id    uuid not null references public.game_nights(id) on delete cascade,
  opponent    text not null,
  our_score   int,
  opp_score   int,
  competition text,
  status      text not null default 'encerrada' check (status in ('agendada','ao_vivo','encerrada')),
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists matches_night_idx on public.matches (night_id, sort_order);

-- Eventos informativos da noite ----------------------------------------------
create table if not exists public.night_events (
  id          uuid primary key default gen_random_uuid(),
  night_id    uuid not null references public.game_nights(id) on delete cascade,
  time_label  text,
  title       text not null,
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists night_events_night_idx on public.night_events (night_id, sort_order);

-- Candidatos ao craque (quem jogou naquela noite) ----------------------------
create table if not exists public.mvp_candidates (
  id         uuid primary key default gen_random_uuid(),
  night_id   uuid not null references public.game_nights(id) on delete cascade,
  player_id  text not null references public.players(id) on delete cascade,
  sort_order int not null default 0,
  unique (night_id, player_id)
);
create index if not exists mvp_candidates_night_idx on public.mvp_candidates (night_id);

-- Votos do craque: um por visitante/noite (trocável via upsert) --------------
create table if not exists public.mvp_votes (
  id         uuid primary key default gen_random_uuid(),
  night_id   uuid not null references public.game_nights(id) on delete cascade,
  player_id  text not null references public.players(id) on delete cascade,
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  created_at timestamptz not null default now(),
  unique (night_id, visitor_id)
);
create index if not exists mvp_votes_night_idx on public.mvp_votes (night_id);

-- RLS ------------------------------------------------------------------------
-- Conteúdo (noites/partidas/eventos/candidatos): leitura pública, escrita admin.
do $$
declare t text;
begin
  foreach t in array array['game_nights','matches','night_events','mvp_candidates']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "read_all" on public.%I;', t);
    execute format('create policy "read_all" on public.%I for select using (true);', t);
    execute format('drop policy if exists "write_auth" on public.%I;', t);
    execute format('create policy "write_auth" on public.%I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- Votos: leitura pública; visitante insere/atualiza (upsert) e apaga o próprio.
alter table public.mvp_votes enable row level security;

drop policy if exists "mvp_votes_read_all" on public.mvp_votes;
create policy "mvp_votes_read_all" on public.mvp_votes
  for select using (true);

drop policy if exists "mvp_votes_insert_anyone" on public.mvp_votes;
create policy "mvp_votes_insert_anyone" on public.mvp_votes
  for insert to anon, authenticated with check (true);

drop policy if exists "mvp_votes_update_anyone" on public.mvp_votes;
create policy "mvp_votes_update_anyone" on public.mvp_votes
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "mvp_votes_delete_anyone" on public.mvp_votes;
create policy "mvp_votes_delete_anyone" on public.mvp_votes
  for delete to anon, authenticated using (true);
