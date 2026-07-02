-- ============================================================================
-- 009 — Ciclo de vida da noite e do craque da noite
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
--
-- Fluxo: a noite começa "em_andamento"; o admin a ENCERRA; só então pode ABRIR
-- a votação de craque; ao ENCERRAR a votação, o craque (mais votado) é
-- calculado e salvo em `mvp_winner_id`. Substitui o antigo booleano `mvp_open`.
-- ============================================================================

alter table public.game_nights
  add column if not exists status text not null default 'em_andamento'
    check (status in ('em_andamento','encerrada')),
  add column if not exists mvp_status text not null default 'nao_iniciada'
    check (mvp_status in ('nao_iniciada','aberta','encerrada')),
  add column if not exists mvp_winner_id text references public.players(id) on delete set null;

create index if not exists game_nights_mvp_winner_idx
  on public.game_nights (mvp_winner_id) where mvp_winner_id is not null;

-- Migração única do modelo antigo (`mvp_open`). Guardada pela existência da
-- coluna: roda uma vez e some, tornando o script seguro para reexecução.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'game_nights' and column_name = 'mvp_open'
  ) then
    -- Noites já cadastradas são passadas: marca como encerradas e leva a votação
    -- que estava aberta para o novo estado "aberta" (senão, "nao_iniciada").
    update public.game_nights
      set status = 'encerrada',
          mvp_status = case when mvp_open then 'aberta' else 'nao_iniciada' end;
    alter table public.game_nights drop column mvp_open;
  end if;
end $$;
