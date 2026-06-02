-- ============================================================
-- TELEGRAM-ПРЕДЛОЖКА: привязка группы к поездке (tg_links) и
-- входящие предложения из чата (tg_suggestions).
--
-- Бот пишет сюда сервис-ролью (минует RLS). Приложение читает/меняет
-- ТОЛЬКО строки своих поездок (RLS через владельца trips).
--
-- ВАЖНО: trips.id — text (id задаёт приложение), поэтому trip_id — text.
-- Запуск: Supabase Dashboard → SQL Editor → выполнить целиком.
-- ============================================================

-- Привязка Telegram-чата (группы) к поездке.
-- Поток: приложение создаёт строку (code, trip_id, user_id), участник пишет
-- в группе «/connect <code>», бот проставляет chat_id (сервис-ролью).
create table if not exists public.tg_links (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  trip_id     text not null references public.trips (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chat_id     text,                       -- проставляет бот при /connect (null = не подключено)
  created_at  timestamptz not null default now()
);
create index if not exists tg_links_trip_id_idx on public.tg_links (trip_id);
create index if not exists tg_links_chat_id_idx on public.tg_links (chat_id);

-- Входящие предложения из чата (ссылки, разобранные ботом).
create table if not exists public.tg_suggestions (
  id          uuid primary key default gen_random_uuid(),
  trip_id     text not null references public.trips (id) on delete cascade,
  chat_id     text not null,
  kind        text not null default 'place',   -- 'place' | 'shopping'
  url         text,
  name        text,
  description text,
  image       text,
  coords      jsonb,                            -- [lat,lng] | null
  from_user   text,                             -- имя отправителя
  raw_text    text,
  status      text not null default 'new',      -- 'new' | 'added' | 'dismissed'
  tag         text not null default '',         -- метка: 'Полина' | 'Сережа' | 'Важно' | '' (без тега)
  created_at  timestamptz not null default now()
);
create index if not exists tg_suggestions_trip_id_idx on public.tg_suggestions (trip_id);

-- ============================================================
-- RLS: владелец поездки (trips.user_id = auth.uid()) видит/меняет свои строки.
-- Бот пишет сервис-ключом (SERVICE_ROLE) — он RLS минует, отдельных политик
-- для него не нужно. auth.uid() обёрнут в (select …) — вызывается один раз.
-- ============================================================
alter table public.tg_links enable row level security;
alter table public.tg_links force row level security;

drop policy if exists tg_links_select on public.tg_links;
create policy tg_links_select on public.tg_links
  for select using (
    exists (select 1 from public.trips t
            where t.id = trip_id and t.user_id = (select auth.uid())));

drop policy if exists tg_links_insert on public.tg_links;
create policy tg_links_insert on public.tg_links
  for insert with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.trips t
                where t.id = trip_id and t.user_id = (select auth.uid())));

drop policy if exists tg_links_delete on public.tg_links;
create policy tg_links_delete on public.tg_links
  for delete using (
    exists (select 1 from public.trips t
            where t.id = trip_id and t.user_id = (select auth.uid())));

alter table public.tg_suggestions enable row level security;
alter table public.tg_suggestions force row level security;

drop policy if exists tg_suggestions_select on public.tg_suggestions;
create policy tg_suggestions_select on public.tg_suggestions
  for select using (
    exists (select 1 from public.trips t
            where t.id = trip_id and t.user_id = (select auth.uid())));

-- Приложение помечает обработанные (status) и удаляет ненужные.
drop policy if exists tg_suggestions_update on public.tg_suggestions;
create policy tg_suggestions_update on public.tg_suggestions
  for update using (
    exists (select 1 from public.trips t
            where t.id = trip_id and t.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.trips t
            where t.id = trip_id and t.user_id = (select auth.uid())));

drop policy if exists tg_suggestions_delete on public.tg_suggestions;
create policy tg_suggestions_delete on public.tg_suggestions
  for delete using (
    exists (select 1 from public.trips t
            where t.id = trip_id and t.user_id = (select auth.uid())));

-- Публичный бакет Storage для фото из сообщений (бот заливает сервис-ролью,
-- чтение публичное по URL). Без него фото не сохранится, текст — сохранится.
insert into storage.buckets (id, name, public)
  values ('tg-photos', 'tg-photos', true)
  on conflict (id) do nothing;
