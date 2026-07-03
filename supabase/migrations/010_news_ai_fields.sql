-- ============================================================================
-- 010 — Campos de IA nas notícias (resumo automático das noites)
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
--
-- Dá suporte à geração automática de uma notícia-resumo pela IA ao encerrar a
-- votação de craque de uma noite (ver api/ai-game-summary.js):
--   • ai_generated    → marca a matéria como gerada por IA (rótulo/filtro).
--   • source_night_id → liga a matéria à noite de origem; garante idempotência
--                       (uma matéria por noite; regenerar atualiza a mesma linha).
-- ============================================================================

alter table public.news
  add column if not exists ai_generated boolean not null default false,
  add column if not exists source_night_id uuid
    references public.game_nights(id) on delete set null;

create index if not exists news_source_night_id_idx
  on public.news (source_night_id) where source_night_id is not null;
