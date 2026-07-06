-- ============================================================================
-- 016 — Contas de torcedor: cadastro/login e gating de comentários e votos
-- ============================================================================
-- Rode no SQL Editor do Supabase (cole e Run). Idempotente.
--
-- Passa a exigir CONTA + LOGIN para comentar, responder, curtir e votar no
-- craque. Introduz `profiles` (1:1 com auth.users) com nome de exibição, jogador
-- vinculado (define o avatar) e `is_admin`. A identidade anônima (visitor_id /
-- author texto livre) é substituída por `user_id = auth.uid()`.
--
-- ⚠️ Segurança: até aqui "autenticado = admin". Com cadastro público, TODO fã
-- logado seria `authenticated`; por isso as políticas de escrita do conteúdo do
-- site passam a exigir `public.is_admin()` (admin de verdade), e o /admin no
-- front passa a exigir profile.is_admin.
--
-- Após rodar, marque a conta admin:  update public.profiles set is_admin = true
--                                     where id = '<uuid do admin em Auth>';
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Zera as interações sociais existentes (recomeço limpo, só com usuários)
-- ---------------------------------------------------------------------------
truncate table public.mvp_votes, public.comment_likes, public.player_comments
  restart identity cascade;

-- ---------------------------------------------------------------------------
-- 1. Perfis (1:1 com auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  player_id    text references public.players(id) on delete set null,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists profiles_player_idx on public.profiles (player_id);

-- ---------------------------------------------------------------------------
-- 2. Helper: o usuário atual é admin? (security definer evita recursão de RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_admin
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Provisionamento automático do perfil ao criar a conta
-- ---------------------------------------------------------------------------
-- Lê display_name / player_id de raw_user_meta_data (enviados no signUp).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
  v_pid  text := nullif(trim(new.raw_user_meta_data ->> 'player_id'), '');
begin
  insert into public.profiles (id, display_name, player_id)
  values (
    new.id,
    coalesce(v_name, split_part(new.email, '@', 1)),
    v_pid
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: cria profile para contas que já existiam (ex.: o admin atual, criado
-- antes deste trigger). Depois marque o admin com is_admin = true (ver cabeçalho).
insert into public.profiles (id, display_name, player_id)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), split_part(u.email, '@', 1)),
  nullif(trim(u.raw_user_meta_data ->> 'player_id'), '')
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Impede auto-promoção: só admin altera is_admin
-- ---------------------------------------------------------------------------
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  -- Bloqueia troca de is_admin por usuário comum. auth.uid() nulo = contexto de
  -- servidor (SQL Editor / service role), permitido — é como se promove o admin.
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Apenas administradores podem alterar is_admin.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------------------------------------------------------------------------
-- 5. RLS de profiles: leitura pública; usuário edita só o próprio perfil
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. Migra a identidade das interações: visitor_id / author  →  user_id
-- ---------------------------------------------------------------------------
-- Comentários: remove o nome-texto; passa a apontar para o perfil do autor.
alter table public.player_comments drop column if exists author;
alter table public.player_comments
  add column if not exists user_id uuid not null default auth.uid()
  references public.profiles(id) on delete cascade;
create index if not exists player_comments_user_idx on public.player_comments (user_id);

-- Curtidas: uma por usuário/comentário.
alter table public.comment_likes drop column if exists visitor_id;
alter table public.comment_likes
  add column if not exists user_id uuid not null default auth.uid()
  references public.profiles(id) on delete cascade;
alter table public.comment_likes drop constraint if exists comment_likes_comment_id_visitor_id_key;
alter table public.comment_likes drop constraint if exists comment_likes_comment_user_key;
alter table public.comment_likes add constraint comment_likes_comment_user_key unique (comment_id, user_id);

-- Votos de craque: um por usuário/noite (trocável via upsert).
alter table public.mvp_votes drop column if exists visitor_id;
alter table public.mvp_votes
  add column if not exists user_id uuid not null default auth.uid()
  references public.profiles(id) on delete cascade;
alter table public.mvp_votes drop constraint if exists mvp_votes_night_id_visitor_id_key;
alter table public.mvp_votes drop constraint if exists mvp_votes_night_user_key;
alter table public.mvp_votes add constraint mvp_votes_night_user_key unique (night_id, user_id);

-- ---------------------------------------------------------------------------
-- 7. RLS das interações: exige login e só mexe nas próprias linhas
-- ---------------------------------------------------------------------------
-- Comentários: leitura pública; inserir logado (dono = auth.uid()); apagar o
-- próprio ou como admin (moderação).
drop policy if exists "comments_insert_anyone" on public.player_comments;
drop policy if exists "comments_delete_auth" on public.player_comments;
drop policy if exists "comments_insert_auth" on public.player_comments;
drop policy if exists "comments_delete_own_or_admin" on public.player_comments;
create policy "comments_insert_auth" on public.player_comments
  for insert to authenticated with check (user_id = auth.uid());
create policy "comments_delete_own_or_admin" on public.player_comments
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- Curtidas: leitura pública; curtir/descurtir logado, só as próprias.
drop policy if exists "likes_insert_anyone" on public.comment_likes;
drop policy if exists "likes_delete_anyone" on public.comment_likes;
drop policy if exists "likes_insert_own" on public.comment_likes;
drop policy if exists "likes_delete_own" on public.comment_likes;
create policy "likes_insert_own" on public.comment_likes
  for insert to authenticated with check (user_id = auth.uid());
create policy "likes_delete_own" on public.comment_likes
  for delete to authenticated using (user_id = auth.uid());

-- Votos: leitura pública; inserir/atualizar/apagar logado, só os próprios.
drop policy if exists "mvp_votes_insert_anyone" on public.mvp_votes;
drop policy if exists "mvp_votes_update_anyone" on public.mvp_votes;
drop policy if exists "mvp_votes_delete_anyone" on public.mvp_votes;
drop policy if exists "mvp_votes_insert_own" on public.mvp_votes;
drop policy if exists "mvp_votes_update_own" on public.mvp_votes;
drop policy if exists "mvp_votes_delete_own" on public.mvp_votes;
create policy "mvp_votes_insert_own" on public.mvp_votes
  for insert to authenticated with check (user_id = auth.uid());
create policy "mvp_votes_update_own" on public.mvp_votes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "mvp_votes_delete_own" on public.mvp_votes
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 8. Reforça a escrita do CONTEÚDO do site: só admin de verdade
-- ---------------------------------------------------------------------------
-- Antes: `for all to authenticated`. Agora que fãs logam, restringe a is_admin().
do $$
declare t text;
begin
  foreach t in array array[
    'club','players','news','gallery_photos','kits','milestones','big_numbers',
    'game_nights','matches','night_events','mvp_candidates','match_goals','night_notes'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists "write_auth" on public.%I;', t);
      execute format(
        'create policy "write_auth" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());',
        t);
    end if;
  end loop;
end $$;

-- night_notes usava a policy "night_notes_rw_auth" (não "write_auth"): reforça também.
drop policy if exists "night_notes_rw_auth" on public.night_notes;
create policy "night_notes_rw_auth" on public.night_notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 9. Storage: uploads/edições continuam só para admin (fãs não sobem imagem)
-- ---------------------------------------------------------------------------
drop policy if exists "storage_write_auth"  on storage.objects;
drop policy if exists "storage_update_auth" on storage.objects;
drop policy if exists "storage_delete_auth" on storage.objects;

create policy "storage_write_auth" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('players','gallery','kits','hero','news') and public.is_admin());

create policy "storage_update_auth" on storage.objects
  for update to authenticated
  using (bucket_id in ('players','gallery','kits','hero','news') and public.is_admin());

create policy "storage_delete_auth" on storage.objects
  for delete to authenticated
  using (bucket_id in ('players','gallery','kits','hero','news') and public.is_admin());
