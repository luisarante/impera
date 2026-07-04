-- ============================================================================
-- 014 — Gols como EVENTOS: autor opcional (bot) e time (nós/adversário)
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
--
-- Suporta o fluxo AO VIVO de gols (ver AdminGames + timeline em /jogos):
--   • player_id agora é OPCIONAL → gol nosso sem autor (bot marcou).
--   • team ('nos'|'adv') → permite registrar também o gol do adversário.
-- Linhas antigas viram team='nos' (o padrão), mantendo o comportamento atual.
-- ============================================================================

alter table public.match_goals
  alter column player_id drop not null,
  add column if not exists team text not null default 'nos' check (team in ('nos','adv'));
