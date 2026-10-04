# Setup do Supabase — Imperatrice FC

Passo a passo para colocar o backend no ar. Leva ~10 minutos e é tudo no plano gratuito.

## 1. Criar o projeto

1. Acesse https://supabase.com e crie um projeto novo.
2. Região: **South America (São Paulo)** (menor latência no Brasil).
3. Defina uma senha forte para o banco (guarde — não é a senha do admin do site).
4. Espere o projeto provisionar (~2 min).

## 2. Rodar o schema

1. No painel do projeto, abra **SQL Editor**.
2. Cole **todo** o conteúdo de [`schema.sql`](./schema.sql) e clique em **Run**.
3. Isso cria as tabelas, as políticas de segurança (RLS), os buckets de imagem e
   já popula tudo com os dados atuais do clube.

> Reexecutar o script é seguro — ele recria tudo do zero.

## 3. Subir as imagens

O SQL cria os buckets, mas as imagens precisam ser enviadas manualmente uma vez.
No painel, abra **Storage** e suba os arquivos de `public/assets/` para os buckets:

| Bucket    | Arquivos (de `public/assets/...`)                          |
|-----------|------------------------------------------------------------|
| `players` | `players/p1.jpeg`, `p2.jpeg`, `p3.jpeg`, `p4.jpeg`, `abde.jpeg` |
| `kits`    | `kits/home.jpeg`, `kits/home-back.jpeg`                     |
| `hero`    | `hero.jpeg`                                                 |

> Os nomes dos arquivos no bucket devem ser **exatamente** esses (ex.: `p1.jpeg`),
> pois o seed referencia esses nomes. A galeria reaproveita essas mesmas imagens.

Daqui pra frente, fotos novas de jogadores e da galeria são enviadas pelo
painel `/admin` do próprio site — não precisa mexer no Storage na mão.

## 4. Criar o usuário admin

1. No painel, abra **Authentication > Users > Add user**.
2. Informe **email** e **senha** do dono do clube.
3. Marque **Auto Confirm User** (senão o login não funciona sem confirmar email).

Esse é o login do painel `/admin`. Crie quantos quiser para quem vai administrar.

## 5. Pegar as credenciais para o site

Em **Project Settings > API**, copie:

- **Project URL** → vai em `VITE_SUPABASE_URL`
- **anon public key** → vai em `VITE_SUPABASE_ANON_KEY`

Coloque esses valores no arquivo `.env.local` do projeto (local) e nas variáveis de
ambiente da Vercel (produção). A `anon key` é segura para o frontend — quem protege
as escritas é o RLS + login, configurados no passo 2.

## Expansão EAFC e Overwatch

Antes de publicar esta versão, aplique `migrations/022_news_official_accounts.sql`
no banco existente pelo SQL Editor do Supabase. Não execute `schema.sql` em um
banco com conteúdo: ele recria as tabelas.

A migração adiciona `news.official_account`, com `imperafc` como padrão para
notícias antigas e resumos automáticos de EAFC. O painel de notícias permite
escolher `imperafc` ou `imperaow`. As permissões de publicação continuam restritas
aos administradores existentes; estas são identidades editoriais, não novos logins.

Rotas: `/` (portal), `/eafc` (experiência anterior), `/overwatch` (countdown),
`/noticias` (feed), `/noticias?perfil=imperafc` e `/noticias?perfil=imperaow` (perfis).
URLs antigas de matérias, elenco, partidas, estatísticas e galeria são preservadas.

O countdown está definido em `src/lib/countdown.ts` para 11/10/2026 às 00:00
de Brasília (03:00 UTC), e permanece zerado após o prazo.
Validação: `npm run build` e `node --test scripts/countdown.test.mjs` (Node 24+).
