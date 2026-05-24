-- ============================================================
-- СХЕМА БД (Supabase / Postgres)
-- Хранит поездки как JSONB-документ (структура совпадает с
-- моделью фронтенда, см. js/model/entities.js). Применены
-- практики Supabase: RLS с (select auth.uid()), timestamptz,
-- text/jsonb, индекс по FK, автоpopulate updated_at, upsert.
--
-- Запуск: Supabase Dashboard → SQL Editor → выполнить целиком.
-- ============================================================

create table if not exists public.trips (
  -- id поездки задаёт приложение (строковый, напр. 'seoul' или 'trip_…')
  id          text primary key,
  -- владелец; по умолчанию текущий пользователь (Supabase Auth)
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- весь документ поездки
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Индекс по внешнему ключу (Postgres не создаёт его автоматически):
-- ускоряет выборку поездок пользователя и каскадное удаление.
create index if not exists trips_user_id_idx on public.trips (user_id);

-- updated_at проставляется автоматически при каждом UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY: каждый видит и меняет только свои поездки.
-- auth.uid() обёрнут в (select …) — вызывается один раз, а не на
-- каждую строку (практика security-rls-performance).
-- ============================================================
alter table public.trips enable row level security;
alter table public.trips force row level security;

drop policy if exists trips_select on public.trips;
create policy trips_select on public.trips
  for select using ((select auth.uid()) = user_id);

drop policy if exists trips_insert on public.trips;
create policy trips_insert on public.trips
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists trips_update on public.trips;
create policy trips_update on public.trips
  for update using ((select auth.uid()) = user_id)
            with check ((select auth.uid()) = user_id);

drop policy if exists trips_delete on public.trips;
create policy trips_delete on public.trips
  for delete using ((select auth.uid()) = user_id);

-- Примечание: внутри data мы пока не делаем поисковых запросов,
-- поэтому GIN-индекс по jsonb не нужен. Если позже появятся запросы
-- вида data @> '{"city":"Сеул"}' — добавить:
--   create index trips_data_gin on public.trips using gin (data);
