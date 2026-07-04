-- ============================================================================
-- 012 — Temporada atual do clube (página de estatísticas)
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
--
-- A página /estatisticas mostra os números do time SÓ da temporada atual. O
-- recorte é a data de início configurável aqui (via AdminClub):
--   • season_start → conta apenas noites com date >= season_start (nulo = tudo).
--   • season_label → rótulo exibido (ex.: "Temporada 2026").
-- ============================================================================

alter table public.club
  add column if not exists season_label text,
  add column if not exists season_start date;
