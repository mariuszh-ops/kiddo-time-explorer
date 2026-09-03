-- N-11 (audyt 400 / batch D): dziennik akcji admina.
--
-- Log dziala TYLKO w przod — nie zalozony dzis, nie odtworzy historii wstecz.
-- Trigger zapisuje wylacznie zmiany zrobione przez zalogowanego czlowieka
-- (auth.uid() is not null). Publikacja partii idzie przez service_role bez
-- sesji uzytkownika, wiec NIE zasmieca tabeli dziesiatkami tysiecy wierszy.
--
-- Odczyt: tylko admin (RLS + is_admin()). Zakladka "Historia" w panelu = backlog,
-- do odczytu na razie wystarczy SQL.

-- ====================================================================
-- TABELA
-- ====================================================================

create table if not exists public.admin_actions (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid,
  action text not null,
  table_name text not null,
  place_id text,
  row_id uuid,
  before jsonb not null default '{}'::jsonb,
  after jsonb not null default '{}'::jsonb
);

create index if not exists admin_actions_at_idx on public.admin_actions (at desc);
create index if not exists admin_actions_place_idx on public.admin_actions (place_id, at desc);

alter table public.admin_actions enable row level security;

drop policy if exists "admin_actions_select_admin" on public.admin_actions;
create policy "admin_actions_select_admin"
  on public.admin_actions
  for select
  to authenticated
  using (public.is_admin());

grant select on public.admin_actions to authenticated;

-- ====================================================================
-- TRIGGER 1 — katalog (admin_hidden / featured / locked_fields / description / price_note)
-- ====================================================================

create or replace function public.log_admin_activity_change()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  b jsonb := '{}'::jsonb;
  a jsonb := '{}'::jsonb;
begin
  -- zapis ze skryptu (service_role, brak sesji) nie jest akcja admina
  if auth.uid() is null then
    return null;
  end if;

  if new.admin_hidden is distinct from old.admin_hidden then
    b := b || jsonb_build_object('admin_hidden', old.admin_hidden);
    a := a || jsonb_build_object('admin_hidden', new.admin_hidden);
  end if;

  if new.featured is distinct from old.featured then
    b := b || jsonb_build_object('featured', old.featured);
    a := a || jsonb_build_object('featured', new.featured);
  end if;

  if new.locked_fields is distinct from old.locked_fields then
    b := b || jsonb_build_object('locked_fields', to_jsonb(old.locked_fields));
    a := a || jsonb_build_object('locked_fields', to_jsonb(new.locked_fields));
  end if;

  if new.description is distinct from old.description then
    b := b || jsonb_build_object('description', left(coalesce(old.description, ''), 500));
    a := a || jsonb_build_object('description', left(coalesce(new.description, ''), 500));
  end if;

  if new.price_note is distinct from old.price_note then
    b := b || jsonb_build_object('price_note', old.price_note);
    a := a || jsonb_build_object('price_note', new.price_note);
  end if;

  if b = '{}'::jsonb then
    return null;
  end if;

  insert into public.admin_actions (user_id, action, table_name, place_id, before, after)
  values (auth.uid(), 'update', 'public_activities', new.place_id, b, a);

  return null;
end;
$function$;

drop trigger if exists trg_admin_actions_public_activities on public.public_activities;
create trigger trg_admin_actions_public_activities
after update on public.public_activities
for each row
execute function public.log_admin_activity_change();

-- ====================================================================
-- TRIGGER 2 — moderacja (status opinii i zgloszen)
-- ====================================================================

create or replace function public.log_admin_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then
    return null;
  end if;

  if new.status is not distinct from old.status then
    return null;
  end if;

  insert into public.admin_actions (user_id, action, table_name, place_id, row_id, before, after)
  values (
    auth.uid(),
    'status',
    tg_table_name::text,
    new.place_id,
    new.id,
    jsonb_build_object('status', old.status),
    jsonb_build_object('status', new.status)
  );

  return null;
end;
$function$;

drop trigger if exists trg_admin_actions_user_reviews on public.user_reviews;
create trigger trg_admin_actions_user_reviews
after update on public.user_reviews
for each row
execute function public.log_admin_status_change();

drop trigger if exists trg_admin_actions_issue_reports on public.issue_reports;
create trigger trg_admin_actions_issue_reports
after update on public.issue_reports
for each row
execute function public.log_admin_status_change();
