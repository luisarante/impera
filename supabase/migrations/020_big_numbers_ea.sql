-- ============================================================================
-- 020 — Números da home alimentados pela EA (big_numbers)
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
--
-- `big_numbers` (seção "cartão de visitas" da home) era 100% manual e ficava
-- desatualizada. Quando `ea_field` está preenchido, a sincronização
-- (scripts/ea-sync-local.mjs) atualiza sozinha `value`/`numeric_value` desse
-- número a cada rodada — o admin continua livre para editar rótulo/cor/ordem,
-- ou remover o vínculo (ea_field = null) e voltar a editar o valor na mão.
--
-- Chaves válidas hoje: goals, games_played, wins, titles, best_division,
-- skill_rating, promotions (ver FIELD_MAP em api/_eaSync.js).
-- ============================================================================

alter table public.big_numbers add column if not exists ea_field text;

-- Liga os 3 números já cadastrados aos dados reais da EA (eram valores fixos
-- digitados na mão — "Divisão atual" nunca foi atualizada, por exemplo).
update public.big_numbers set ea_field = 'best_division', label = 'Melhor divisão alcançada — Pro Clubs'
  where id = 'b1';
update public.big_numbers set ea_field = 'goals'
  where id = 'b2';
update public.big_numbers set ea_field = 'titles', label = 'Vezes em 1º lugar na divisão'
  where id = 'b3';
