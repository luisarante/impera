-- ============================================================================
-- 005 — Curtidas e respostas nos comentários dos jogadores
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
-- Depende da migração 004 (tabela player_comments).
-- ============================================================================

-- 1) Respostas: comentário pode ter um "pai" (thread de 1 nível, estilo YouTube).
alter table public.player_comments
  add column if not exists parent_id uuid
  references public.player_comments(id) on delete cascade;

create index if not exists player_comments_parent_idx
  on public.player_comments (parent_id, created_at);

-- 2) Curtidas: uma linha por visitante/comentário (dedupe via unique).
--    O visitante é identificado por um id anônimo guardado no localStorage.
create table if not exists public.comment_likes (
  id         uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.player_comments(id) on delete cascade,
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  created_at timestamptz not null default now(),
  unique (comment_id, visitor_id)
);

create index if not exists comment_likes_comment_idx
  on public.comment_likes (comment_id);

alter table public.comment_likes enable row level security;

-- Leitura pública (para contar as curtidas).
drop policy if exists "likes_read_all" on public.comment_likes;
create policy "likes_read_all" on public.comment_likes
  for select using (true);

-- Qualquer visitante pode curtir (inserir) e descurtir (apagar).
drop policy if exists "likes_insert_anyone" on public.comment_likes;
create policy "likes_insert_anyone" on public.comment_likes
  for insert to anon, authenticated with check (true);

drop policy if exists "likes_delete_anyone" on public.comment_likes;
create policy "likes_delete_anyone" on public.comment_likes
  for delete to anon, authenticated using (true);
