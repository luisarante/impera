-- ============================================================================
-- 011 — Acontecimentos (bastidores) privados por noite de jogo
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
--
-- Texto livre que o admin escreve sobre a noite (ex.: desentendimentos entre
-- jogadores) para a IA usar no resumo automático (ver api/ai-game-summary.js).
--
-- PRIVADO: a RLS libera apenas para 'authenticated' (admin). O visitante anônimo
-- NÃO recebe policy, então a RLS nega a leitura. A função de IA lê com a service
-- role, que bypassa a RLS. Por isso os bastidores nunca vazam para o site.
-- ============================================================================

create table if not exists public.night_notes (
  night_id   uuid primary key references public.game_nights(id) on delete cascade,
  body       text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.night_notes enable row level security;

drop policy if exists "night_notes_rw_auth" on public.night_notes;
create policy "night_notes_rw_auth" on public.night_notes
  for all to authenticated using (true) with check (true);
