-- ============================================================================
-- 013 — Realtime nas noites de jogo (página /jogos atualizando AO VIVO)
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
--
-- Publica as tabelas das noites na publication `supabase_realtime` para que os
-- visitantes recebam as mudanças (placar, gols, abertura/votação de craque) em
-- tempo real. A leitura pública já é liberada pela RLS (read_all), então o
-- cliente anônimo recebe os eventos normalmente.
-- ============================================================================

-- Garante que a publication do Realtime exista (padrão no Supabase).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- Adiciona cada tabela (só se ainda não estiver publicada) — seguro reexecutar.
do $$
declare t text;
begin
  foreach t in array array['game_nights','matches','match_goals','night_events','mvp_candidates','mvp_votes']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
