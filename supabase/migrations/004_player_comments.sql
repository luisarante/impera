-- ============================================================================
-- 004 — Comentários da torcida sobre os jogadores (página do elenco)
-- ============================================================================
-- Rode este arquivo no SQL Editor do Supabase (cole e Run).
-- Reexecutar é seguro (idempotente).
-- ============================================================================

create table if not exists public.player_comments (
  id         uuid primary key default gen_random_uuid(),
  player_id  text not null references public.players(id) on delete cascade,
  author     text not null check (char_length(author) between 1 and 40),
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Busca dos comentários de um jogador, do mais novo para o mais antigo.
create index if not exists player_comments_player_idx
  on public.player_comments (player_id, created_at desc);

alter table public.player_comments enable row level security;

-- Leitura pública (qualquer visitante vê os comentários).
drop policy if exists "comments_read_all" on public.player_comments;
create policy "comments_read_all" on public.player_comments
  for select using (true);

-- Qualquer visitante (anon) pode publicar um comentário.
drop policy if exists "comments_insert_anyone" on public.player_comments;
create policy "comments_insert_anyone" on public.player_comments
  for insert to anon, authenticated with check (true);

-- Só o admin logado pode apagar (moderação). Visitantes não editam/apagam.
drop policy if exists "comments_delete_auth" on public.player_comments;
create policy "comments_delete_auth" on public.player_comments
  for delete to authenticated using (true);
