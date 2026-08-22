-- ============================================================================
-- 017 — Comunidade: fórum de tópicos, respostas, curtidas e enquetes
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
-- Depende da migração 016 (profiles + public.is_admin()).
--
-- Fã logado inicia um tópico (com corpo livre) e, opcionalmente, uma enquete
-- de 2 a 6 opções. Outros fãs logados respondem (thread de 1 nível, igual
-- player_comments) e curtem tópicos/respostas. Voto na enquete é 1 por
-- usuário/tópico, trocável via upsert (mesmo padrão de mvp_votes). Autor do
-- tópico (ou admin) pode adicionar/editar/remover opções da enquete depois de
-- criada. Leitura é pública; escrita exige conta.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tópicos
-- ---------------------------------------------------------------------------
create table if not exists public.community_topics (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title      text not null check (char_length(title) between 3 and 140),
  body       text not null check (char_length(body) between 1 and 4000),
  has_poll   boolean not null default false,
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_topics_created_idx on public.community_topics (created_at desc);
create index if not exists community_topics_user_idx on public.community_topics (user_id);

-- ---------------------------------------------------------------------------
-- 2. Respostas (thread de 1 nível, igual player_comments)
-- ---------------------------------------------------------------------------
create table if not exists public.community_replies (
  id         uuid primary key default gen_random_uuid(),
  topic_id   uuid not null references public.community_topics(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  parent_id  uuid references public.community_replies(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists community_replies_topic_idx on public.community_replies (topic_id, created_at);
create index if not exists community_replies_parent_idx on public.community_replies (parent_id, created_at);
create index if not exists community_replies_user_idx on public.community_replies (user_id);

-- ---------------------------------------------------------------------------
-- 3. Curtidas (tópico e resposta) — uma linha por usuário/alvo
-- ---------------------------------------------------------------------------
create table if not exists public.community_topic_likes (
  id         uuid primary key default gen_random_uuid(),
  topic_id   uuid not null references public.community_topics(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (topic_id, user_id)
);
create index if not exists community_topic_likes_topic_idx on public.community_topic_likes (topic_id);

create table if not exists public.community_reply_likes (
  id         uuid primary key default gen_random_uuid(),
  reply_id   uuid not null references public.community_replies(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (reply_id, user_id)
);
create index if not exists community_reply_likes_reply_idx on public.community_reply_likes (reply_id);

-- ---------------------------------------------------------------------------
-- 4. Enquete: opções (2–6, validado na aplicação) + votos (1 por usuário/tópico)
-- ---------------------------------------------------------------------------
create table if not exists public.community_poll_options (
  id         uuid primary key default gen_random_uuid(),
  topic_id   uuid not null references public.community_topics(id) on delete cascade,
  label      text not null check (char_length(label) between 1 and 120),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists community_poll_options_topic_idx on public.community_poll_options (topic_id, sort_order);

create table if not exists public.community_poll_votes (
  id         uuid primary key default gen_random_uuid(),
  topic_id   uuid not null references public.community_topics(id) on delete cascade,
  option_id  uuid not null references public.community_poll_options(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (topic_id, user_id)
);
create index if not exists community_poll_votes_option_idx on public.community_poll_votes (option_id);

-- ---------------------------------------------------------------------------
-- 5. RLS — leitura pública; escrita exige login; dono ou admin modera
-- ---------------------------------------------------------------------------
alter table public.community_topics enable row level security;
alter table public.community_replies enable row level security;
alter table public.community_topic_likes enable row level security;
alter table public.community_reply_likes enable row level security;
alter table public.community_poll_options enable row level security;
alter table public.community_poll_votes enable row level security;

-- Tópicos: leitura pública; inserir logado (dono = auth.uid()); autor ou admin
-- edita (título/corpo, e admin também pinned) e apaga.
drop policy if exists "community_topics_read_all" on public.community_topics;
create policy "community_topics_read_all" on public.community_topics
  for select using (true);

drop policy if exists "community_topics_insert_auth" on public.community_topics;
create policy "community_topics_insert_auth" on public.community_topics
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "community_topics_update_own_or_admin" on public.community_topics;
create policy "community_topics_update_own_or_admin" on public.community_topics
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "community_topics_delete_own_or_admin" on public.community_topics;
create policy "community_topics_delete_own_or_admin" on public.community_topics
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- Respostas: leitura pública; inserir logado; apagar o próprio ou admin.
drop policy if exists "community_replies_read_all" on public.community_replies;
create policy "community_replies_read_all" on public.community_replies
  for select using (true);

drop policy if exists "community_replies_insert_auth" on public.community_replies;
create policy "community_replies_insert_auth" on public.community_replies
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "community_replies_delete_own_or_admin" on public.community_replies;
create policy "community_replies_delete_own_or_admin" on public.community_replies
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- Curtidas: leitura pública; curtir/descurtir logado, só as próprias.
drop policy if exists "community_topic_likes_read_all" on public.community_topic_likes;
create policy "community_topic_likes_read_all" on public.community_topic_likes
  for select using (true);
drop policy if exists "community_topic_likes_insert_own" on public.community_topic_likes;
create policy "community_topic_likes_insert_own" on public.community_topic_likes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "community_topic_likes_delete_own" on public.community_topic_likes;
create policy "community_topic_likes_delete_own" on public.community_topic_likes
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "community_reply_likes_read_all" on public.community_reply_likes;
create policy "community_reply_likes_read_all" on public.community_reply_likes
  for select using (true);
drop policy if exists "community_reply_likes_insert_own" on public.community_reply_likes;
create policy "community_reply_likes_insert_own" on public.community_reply_likes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "community_reply_likes_delete_own" on public.community_reply_likes;
create policy "community_reply_likes_delete_own" on public.community_reply_likes
  for delete to authenticated using (user_id = auth.uid());

-- Opções de enquete: leitura pública; gerir (inserir/editar/apagar) é do dono
-- do tópico ou admin — a enquete pode ser criada ou ajustada depois.
drop policy if exists "community_poll_options_read_all" on public.community_poll_options;
create policy "community_poll_options_read_all" on public.community_poll_options
  for select using (true);

drop policy if exists "community_poll_options_insert_owner_or_admin" on public.community_poll_options;
create policy "community_poll_options_insert_owner_or_admin" on public.community_poll_options
  for insert to authenticated with check (
    exists (
      select 1 from public.community_topics t
      where t.id = topic_id and (t.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "community_poll_options_update_owner_or_admin" on public.community_poll_options;
create policy "community_poll_options_update_owner_or_admin" on public.community_poll_options
  for update to authenticated
  using (
    exists (
      select 1 from public.community_topics t
      where t.id = topic_id and (t.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.community_topics t
      where t.id = topic_id and (t.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "community_poll_options_delete_owner_or_admin" on public.community_poll_options;
create policy "community_poll_options_delete_owner_or_admin" on public.community_poll_options
  for delete to authenticated using (
    exists (
      select 1 from public.community_topics t
      where t.id = topic_id and (t.user_id = auth.uid() or public.is_admin())
    )
  );

-- Votos de enquete: leitura pública; inserir/atualizar/apagar logado, só os próprios.
drop policy if exists "community_poll_votes_read_all" on public.community_poll_votes;
create policy "community_poll_votes_read_all" on public.community_poll_votes
  for select using (true);
drop policy if exists "community_poll_votes_insert_own" on public.community_poll_votes;
create policy "community_poll_votes_insert_own" on public.community_poll_votes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "community_poll_votes_update_own" on public.community_poll_votes;
create policy "community_poll_votes_update_own" on public.community_poll_votes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "community_poll_votes_delete_own" on public.community_poll_votes;
create policy "community_poll_votes_delete_own" on public.community_poll_votes
  for delete to authenticated using (user_id = auth.uid());
