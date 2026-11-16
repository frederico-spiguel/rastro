-- Rastro: esquema do banco no Supabase.
-- Como usar: Supabase > SQL Editor > New query > colar tudo > Run. Pode rodar de novo sem problema.
--
-- Privacidade: o e-mail fica só na parte de autenticação do Supabase (auth.users).
-- As tabelas abaixo guardam apenas o id anônimo da conta, apelido e código de participante.
-- RLS (row level security): cada jogador só lê e altera as PRÓPRIAS linhas.
-- A dupla vê tudo pelo painel do Supabase (Table Editor / SQL), que ignora o RLS.

create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  apelido text not null check (char_length(apelido) between 2 and 30),
  codigo_participante text check (codigo_participante is null or char_length(codigo_participante) <= 30),
  consentiu_em timestamptz not null,
  experiencia jsonb,
  criado_em timestamptz not null default now()
);

create table if not exists public.progresso (
  usuario uuid not null default auth.uid() references auth.users (id) on delete cascade,
  desafio text not null,
  estrelas smallint not null default 0 check (estrelas between 0 and 3),
  vezes integer not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (usuario, desafio)
);

create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  usuario uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null,
  desafio text,
  dados jsonb,
  quando timestamptz not null default now()
);
create index if not exists eventos_usuario_quando on public.eventos (usuario, quando);

alter table public.perfis enable row level security;
alter table public.progresso enable row level security;
alter table public.eventos enable row level security;

drop policy if exists "perfil: dono" on public.perfis;
create policy "perfil: dono" on public.perfis
  for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "progresso: dono" on public.progresso;
create policy "progresso: dono" on public.progresso
  for all to authenticated
  using (usuario = auth.uid()) with check (usuario = auth.uid());

drop policy if exists "eventos: dono le" on public.eventos;
create policy "eventos: dono le" on public.eventos
  for select to authenticated using (usuario = auth.uid());

drop policy if exists "eventos: dono insere" on public.eventos;
create policy "eventos: dono insere" on public.eventos
  for insert to authenticated with check (usuario = auth.uid());

drop policy if exists "eventos: dono apaga" on public.eventos;
create policy "eventos: dono apaga" on public.eventos
  for delete to authenticated using (usuario = auth.uid());

-- Visão para a análise do piloto (use no SQL Editor; sem e-mails).
create or replace view public.analise_eventos
with (security_invoker = true) as
select
  p.codigo_participante,
  p.apelido,
  e.quando,
  e.tipo,
  e.desafio,
  e.dados ->> 'linha' as linha,
  e.dados ->> 'comando' as comando,
  e.dados
from public.eventos e
join public.perfis p on p.id = e.usuario;
