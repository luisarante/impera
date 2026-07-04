-- ============================================================================
-- 015 — Assistência nos gols nossos
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
--
-- Registra quem deu a assistência num gol NOSSO (opcional). Alimenta os
-- "garçons da noite" (resumo em /jogos) e a estatística de assistências.
-- ============================================================================

alter table public.match_goals
  add column if not exists assist_id text references public.players(id) on delete set null;
