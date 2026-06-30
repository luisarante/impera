-- ============================================================================
-- Migração 002 — Notícias ricas (autor, data, capa e corpo em HTML)
-- ============================================================================
-- Rode no SQL Editor do Supabase (projeto já criado com o schema.sql base).
-- Seguro reexecutar (idempotente).
-- ============================================================================

-- 1. Novas colunas da tabela news
alter table public.news add column if not exists author       text not null default 'Redação SilviaNews';
alter table public.news add column if not exists published_at timestamptz not null default now();
alter table public.news add column if not exists cover_path   text;
alter table public.news add column if not exists content_html text;

-- 2. Backfill: corpo legado (body text[]) → HTML, e data a partir de created_at
update public.news
set content_html = (
  select string_agg(
    '<p>' || replace(replace(replace(p, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>',
    ''
  )
  from unnest(body) as p
)
where content_html is null;

update public.news set published_at = created_at where published_at is null;

-- 3. Bucket de imagens das notícias (capa + imagens inline do corpo)
insert into storage.buckets (id, name, public)
values ('news', 'news', true)
on conflict (id) do update set public = true;

-- 4. Recria as políticas de Storage incluindo o bucket 'news'
drop policy if exists "storage_read_all"   on storage.objects;
drop policy if exists "storage_write_auth" on storage.objects;
drop policy if exists "storage_update_auth" on storage.objects;
drop policy if exists "storage_delete_auth" on storage.objects;

create policy "storage_read_all" on storage.objects
  for select using (bucket_id in ('players','gallery','kits','hero','news'));

create policy "storage_write_auth" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('players','gallery','kits','hero','news'));

create policy "storage_update_auth" on storage.objects
  for update to authenticated
  using (bucket_id in ('players','gallery','kits','hero','news'));

create policy "storage_delete_auth" on storage.objects
  for delete to authenticated
  using (bucket_id in ('players','gallery','kits','hero','news'));
