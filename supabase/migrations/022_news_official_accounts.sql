-- Notícias existentes e resumos automáticos continuam associados ao EAFC.
alter table public.news
  add column if not exists official_account text not null default 'imperafc'
  check (official_account in ('imperafc', 'imperaow'));

comment on column public.news.official_account is
  'Conta oficial que publica o post: imperafc (EAFC) ou imperaow (Overwatch).';
