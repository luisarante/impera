-- ============================================================================
-- 008 — Minuto do gol (opcional) nos gols do Imperatrice
-- ============================================================================
-- Rode no SQL Editor do Supabase. Idempotente. Depende da migração 007.
-- ============================================================================

alter table public.match_goals
  add column if not exists minute int;
