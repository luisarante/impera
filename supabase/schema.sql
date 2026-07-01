-- ============================================================================
-- Imperatrice FC — Schema do Supabase
-- ============================================================================
-- Como usar:
--   1. Crie um projeto em https://supabase.com (regiao South America - Sao Paulo).
--   2. Abra "SQL Editor" no painel e cole TODO este arquivo. Clique em "Run".
--   3. Crie os buckets de imagem e faca upload das fotos (ver supabase/README.md).
--   4. Crie o usuario admin em Authentication > Users > "Add user"
--      (email + senha, "Auto Confirm User" marcado).
--
-- Reexecutar e seguro: o script dropa e recria tudo (idempotente).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Limpeza (permite reexecucao)
-- ---------------------------------------------------------------------------
drop table if exists public.comment_likes cascade;
drop table if exists public.player_comments cascade;
drop table if exists public.players      cascade;
drop table if exists public.news         cascade;
drop table if exists public.gallery_photos cascade;
drop table if exists public.kits         cascade;
drop table if exists public.milestones   cascade;
drop table if exists public.big_numbers  cascade;
drop table if exists public.club         cascade;

-- ---------------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------------

-- Clube (linha unica)
create table public.club (
  id           int primary key default 1 check (id = 1),
  name         text not null,
  badge_name   text not null,
  tagline      text not null,
  eternal_motto text not null
);

-- Elenco (pilares + restante, unificados via is_pillar)
create table public.players (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  number      text not null,
  position    text not null,
  role        text not null check (role in ('GK','LB','CB','RB','CM','LW','ST','RW')),
  starter     boolean not null default false,
  is_pillar   boolean not null default false,
  dilemma     text,
  description text,
  accent      text check (accent in ('accent','gold')),
  photo_path  text,                 -- objeto no bucket "players" (ex.: 'p1.jpeg')
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- Noticias (SilviaNews)
create table public.news (
  id         text primary key default gen_random_uuid()::text,
  kicker     text not null,
  headline   text not null,
  lead       text not null,
  body       text[] not null default '{}',         -- legado (corpo antigo em parágrafos)
  author     text not null default 'Redação SilviaNews',
  published_at timestamptz not null default now(),
  cover_path text,                                  -- capa no bucket "news"
  content_html text,                                -- corpo rico (HTML do editor)
  verified   boolean not null default false,
  featured   boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Galeria de fotos (bucket+path para reaproveitar imagens de qualquer bucket)
create table public.gallery_photos (
  id         text primary key default gen_random_uuid()::text,
  bucket     text not null default 'gallery',
  image_path text not null,
  caption    text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Kits / uniformes
create table public.kits (
  id              text primary key default gen_random_uuid()::text,
  label           text not null,
  name            text not null,
  description     text not null,
  price           text not null,
  primary_color   text not null,
  secondary_color text not null,
  image_path      text,            -- objeto no bucket "kits" (frente)
  image_back_path text,            -- objeto no bucket "kits" (costas)
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

-- Marcos da historia (MagneticTimeline)
create table public.milestones (
  id         text primary key default gen_random_uuid()::text,
  date_label text not null,
  title      text not null,
  text_body  text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Numeros de destaque (BigNumbers)
create table public.big_numbers (
  id            text primary key default gen_random_uuid()::text,
  value         text not null,
  numeric_value int,
  prefix        text,
  suffix        text,
  label         text not null,
  highlight     text check (highlight in ('gold','paper')),
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- Comentarios da torcida sobre os jogadores (pagina do elenco)
-- parent_id != null => resposta a outro comentario (thread de 1 nivel)
create table public.player_comments (
  id         uuid primary key default gen_random_uuid(),
  player_id  text not null references public.players(id) on delete cascade,
  parent_id  uuid references public.player_comments(id) on delete cascade,
  author     text not null check (char_length(author) between 1 and 40),
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index player_comments_player_idx
  on public.player_comments (player_id, created_at desc);
create index player_comments_parent_idx
  on public.player_comments (parent_id, created_at);

-- Curtidas dos comentarios: uma linha por visitante/comentario
create table public.comment_likes (
  id         uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.player_comments(id) on delete cascade,
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  created_at timestamptz not null default now(),
  unique (comment_id, visitor_id)
);
create index comment_likes_comment_idx on public.comment_likes (comment_id);

-- ---------------------------------------------------------------------------
-- 2. Row Level Security: leitura publica, escrita so autenticada
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['club','players','news','gallery_photos','kits','milestones','big_numbers']
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists "read_all" on public.%I;', t);
    execute format(
      'create policy "read_all" on public.%I for select using (true);', t);

    execute format('drop policy if exists "write_auth" on public.%I;', t);
    execute format(
      'create policy "write_auth" on public.%I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- Comentarios: leitura e insercao por qualquer visitante; apagar so admin (moderacao).
alter table public.player_comments enable row level security;

drop policy if exists "comments_read_all" on public.player_comments;
create policy "comments_read_all" on public.player_comments
  for select using (true);

drop policy if exists "comments_insert_anyone" on public.player_comments;
create policy "comments_insert_anyone" on public.player_comments
  for insert to anon, authenticated with check (true);

drop policy if exists "comments_delete_auth" on public.player_comments;
create policy "comments_delete_auth" on public.player_comments
  for delete to authenticated using (true);

-- Curtidas: leitura publica; visitante pode curtir e descurtir.
alter table public.comment_likes enable row level security;

drop policy if exists "likes_read_all" on public.comment_likes;
create policy "likes_read_all" on public.comment_likes
  for select using (true);

drop policy if exists "likes_insert_anyone" on public.comment_likes;
create policy "likes_insert_anyone" on public.comment_likes
  for insert to anon, authenticated with check (true);

drop policy if exists "likes_delete_anyone" on public.comment_likes;
create policy "likes_delete_anyone" on public.comment_likes
  for delete to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- 2.5 Capa unica das noticias: ao marcar uma como capa, desmarca as demais
-- ---------------------------------------------------------------------------
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

drop trigger if exists trg_news_single_featured on public.news;
create trigger trg_news_single_featured
  after insert or update of featured on public.news
  for each row
  when (new.featured)
  execute function public.news_single_featured();

-- ---------------------------------------------------------------------------
-- 3. Buckets de Storage (publicos para leitura)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('players','players',true),
       ('gallery','gallery',true),
       ('kits','kits',true),
       ('hero','hero',true),
       ('news','news',true)
on conflict (id) do update set public = true;

-- Politicas de Storage: qualquer um le; so autenticado escreve.
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

-- ===========================================================================
-- 4. SEED — dados atuais de src/data/club.ts
-- ===========================================================================

insert into public.club (id, name, badge_name, tagline, eternal_motto) values
  (1, 'Imperatrice', 'IMP', 'Aqui, quem Impera é nós.',
   'O gramado lembra de quem nunca desistiu.');

-- Pilares (is_pillar = true, com foto)
insert into public.players
  (id, name, number, position, role, starter, is_pillar, dilemma, description, accent, photo_path, sort_order) values
  ('p1','Abdelah','#7','Segundo Atacante · Camisa 7','LW',true,true,
   '“Eu não corro pra defender. Corro pra decidir.”',
   'O finalizador. Some o jogo inteiro e aparece nos 3 minutos que importam. Frio na cara do goleiro, quente na resenha do vestiário.',
   'gold','p1.jpeg',1),
  ('p2','Jovanovic','#46','Centro Avante · Camisa 46','ST',true,true,
   '“O chute sempre é no gol, se bate na trave, o problema não é meu.”',
   'O maior goleador do Impera está de volta','accent','p2.jpeg',2),
  ('p3','Velinho','#69','Ponta direita · Camisa 69','RW',true,true,
   '“Mato e morro pelo Imperatrice”',
   'O contrato social do clube. Onde ele pisa, atacante adversário desaparece. Lidera no grito e no carrinho na hora certa.',
   'accent','p3.jpeg',3),
  ('p4','Garrido','#1','Zagueira · Camisa 1','CB',true,true,
   '“Estou aqui para organizar a casa.”',
   'A zagueira que transformou a defesa do clube, não é por acaso que somos a melhor defesa do campeonato.',
   'gold','p4.jpeg',4);

-- Restante do elenco (is_pillar = false)
insert into public.players
  (id, name, number, position, role, starter, is_pillar, accent, sort_order) values
  ('p5','Bastos','#12','Goleiro · Camisa 12','GK',true,false,null,5),
  ('p6','Reyes','#3','Lateral Esquerdo · Camisa 3','LB',true,false,null,6),
  ('p7','Koval','#4','Zagueiro · Camisa 4','CB',true,false,null,7),
  ('p8','Tavares','#2','Lateral Direito · Camisa 2','RB',true,false,null,8),
  ('p9','Mendez','#8','Meio-Campo · Camisa 8','CM',true,false,null,9),
  ('p10','Okafor','#10','Meia Armador · Camisa 10','CM',true,false,'gold',10),
  ('p11','Duarte','#5','Volante · Camisa 5','CM',true,false,null,11),
  ('p12','Lima','#22','Goleiro · Camisa 22','GK',false,false,null,12),
  ('p13','Sousa','#15','Zagueiro · Camisa 15','CB',false,false,null,13),
  ('p14','Prado','#21','Lateral · Camisa 21','RB',false,false,null,14),
  ('p15','Nunes','#16','Meio-Campo · Camisa 16','CM',false,false,null,15),
  ('p16','Vidal','#11','Ponta · Camisa 11','LW',false,false,null,16);

-- Noticias
insert into public.news (id, kicker, headline, lead, body, verified, featured, sort_order) values
  ('n1','Bastidores','A nova era',
   'O Imperatrice FC está de cara nova, sem investidores, sem patrocinadores, só com a força da nossa torcida.',
   array[
     'Em um manifesto de independência que chocou o cenário, o Imperatrice FC anunciou uma reestruturação total para a temporada. O tradicional clube de Pro Clubs rompeu com o mercado corporativo e decidiu limpar completamente o seu manto sagrado: a partir de agora, o time jogará sem nenhuma marca ou patrocinador estampado no peito.',
     'A diretoria confirmou que a nova filosofia visa devolver o clube às suas origens, transformando a comunidade no único e verdadeiro combustível da equipe. No vestiário, os jogadores abraçaram a causa e prometem suprir a ausência de investidores com raça e foco absoluto dentro de campo. O novo uniforme minimalista, produzido em parceria com as listras clássicas da Adidas, já está disponível para a torcida.'
   ], true, true, 1),
  ('n2','Mercado','Camisa 10 recusa proposta de rival e renova por mais 3 temporadas',
   'O Maestro disse não a um clube da elite para seguir no projeto. “Dinheiro não compra resenha.”',
   array[
     'A proposta existiu, era alta, e foi recusada em menos de uma hora. O Maestro renovou e mandou recado: lealdade ainda vale algo neste futebol.',
     'Nos bastidores, a diretoria comemorou. “Ele é o projeto”, resumiu um dirigente.'
   ], true, false, 2),
  ('n3','Tática','A defesa que sofreu 1 gol em 9 jogos virou estudo de caso',
   'Analistas tentam decifrar o esquema da Muralha. A resposta pode ser mais simples (e mais raivosa) do que parece.',
   array[
     'Nove jogos, um gol sofrido. O número não é sorte — é organização, leitura e um zagueiro que trata cada bola dividida como questão pessoal.',
     'A SilviaNews cruzou os dados: o segredo está na linha alta e na cobertura que ninguém vê.'
   ], true, false, 3);

-- Backfill do corpo rico (HTML) a partir do corpo legado (body) das noticias do seed.
update public.news
set content_html = (
  select string_agg(
    '<p>' || replace(replace(replace(p, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>',
    ''
  )
  from unnest(body) as p
)
where content_html is null;

-- Galeria (reaproveita imagens ja existentes nos buckets players/kits/hero)
insert into public.gallery_photos (id, bucket, image_path, caption, sort_order) values
  ('ph1','hero',   'hero.jpeg',      'Entrada em campo',1),
  ('ph2','players','p1.jpeg',        'Abdelah, o finalizador',2),
  ('ph3','players','p2.jpeg',        'Jovanovic decide o jogo',3),
  ('ph4','players','p4.jpeg',        'Garrido organiza a defesa',4),
  ('ph5','players','p3.jpeg',        'Velinho na marcação',5),
  ('ph6','players','abde.jpeg',      'A resenha do vestiário',6),
  ('ph7','kits',   'home.jpeg',      'O manto principal',7),
  ('ph8','kits',   'home-back.jpeg', 'O verde da fundação',8);

-- Kits
insert into public.kits
  (id, label, name, description, price, primary_color, secondary_color, image_path, image_back_path, sort_order) values
  ('home','Kit I','Manto Principal',
   'Verde da fundação. O uniforme que sobe a divisão e desce a régua dos adversários.',
   'R$ 299,90','#009640','#1d6034','home.jpeg','home-back.jpeg',1),
  ('away','Kit II','Manto Visitante',
   'Preto de respeito com detalhes em ouro. Para silenciar o estádio do rival.',
   'R$ 299,90','#0c0c0c','#ffd000',null,null,2);

-- Marcos
insert into public.milestones (id, date_label, title, text_body, sort_order) values
  ('m1','DEZ — 2022','A FUNDAÇÃO',
   'Abdelah e velhinho tiveram a ideia de montar um time de futebol, assim nasceu o Imperatrice FC',1),
  ('m2','2023 - 2025','Outros Eafc''s',
   'Nesses anos, o Imperatrice FC colecionou vários troféus e diversos jogadores importantes que fizeram história no clube.',2),
  ('m3','MAR — 2026','O abismo',
   'O Impera estava no fundo do poço, com o elenco rachando e prestes a jogar a última liga da competição.',3),
  ('m4','HOJE','A ERA DE OURO',
   'O Impera está na melhor fase, ganhando todas as partidas que vem pela frente com goleadas históricas. Graças ao grande elenco que contruímos ao longo dos anos.',4);

-- Numeros de destaque
insert into public.big_numbers (id, value, numeric_value, prefix, suffix, label, highlight, sort_order) values
  ('b1','2',   null, null, null, 'Divisão atual — Pro Clubs', 'gold', 1),
  ('b2','500', 537,  '+',  null, 'Gols na história do clube',  null,   2),
  ('b3','3',   3,    null, null, 'Títulos erguidos',           null,   3);
