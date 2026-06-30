-- ============================================================================
-- Migração 003 — Capa única das notícias
-- ============================================================================
-- Garante que apenas UMA notícia seja a "capa" (featured) por vez: ao marcar
-- uma nova como capa, as demais são automaticamente desmarcadas. Assim, ao
-- criar/editar uma notícia e escolhê-la como capa, ela vira a capa do site
-- sem precisar desmarcar a anterior na mão.
--
-- Rode no SQL Editor do Supabase. Seguro reexecutar (idempotente).
-- ============================================================================

-- 1. Normaliza o estado atual: mantém só a capa mais recente, desmarca o resto.
update public.news set featured = false
where featured
  and id <> (
    select id from public.news
    where featured
    order by published_at desc nulls last, created_at desc
    limit 1
  );

-- 2. Função: ao marcar uma notícia como capa, desmarca todas as outras.
create or replace function public.news_single_featured()
returns trigger
language plpgsql
as $$
begin
  update public.news
  set featured = false
  where id <> new.id and featured;
  return new;
end;
$$;

-- 3. Trigger: dispara só quando a linha afetada está sendo marcada como capa.
--    Como a função acima grava featured = false nas demais, o WHEN evita
--    recursão (o gatilho não re-dispara para linhas desmarcadas).
drop trigger if exists trg_news_single_featured on public.news;
create trigger trg_news_single_featured
  after insert or update of featured on public.news
  for each row
  when (new.featured)
  execute function public.news_single_featured();
