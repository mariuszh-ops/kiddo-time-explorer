-- I-05: propozycje atrakcji (activity_submissions) w panelu admina.
--
-- Kontekst D-3: zgloszenia z formularza "Dodaj atrakcje" nie ida na zadna
-- skrzynke. Panel jest JEDYNYM miejscem, w ktorym ktokolwiek je zobaczy.
--
-- Tabela powstala 19.07 poza repo (Management API), wiec repo o niej nie wie.
-- Ta migracja robi trzy rzeczy:
--   1. Zaklada polityki RLS dla admina TYLKO jesli ich brak (na zpqp juz sa
--      i tego nie ruszamy -- drop/create na zywej tabeli to niepotrzebne okno).
--   2. Podpina tabele pod dziennik admin_actions.
--   3. Dokłada licznik 'propozycje_nowe' do admin_stats (badge przy zakladce).
--
-- DLACZEGO OSOBNA FUNKCJA TRIGGERA, a nie log_admin_status_change():
-- tamta czyta new.place_id, a activity_submissions NIE ma takiej kolumny.
-- Podpiecie jej tutaj wywalaloby kazda zmiane statusu bledem
-- "record new has no field place_id".

-- ====================================================================
-- 1. RLS -- tylko brakujace polityki
-- ====================================================================

alter table public.activity_submissions enable row level security;

do $mig$
begin
  if not exists (
    select 1 from pg_policy
     where polrelid = 'public.activity_submissions'::regclass
       and polname  = 'activity_submissions_admin_select'
  ) then
    execute $p$
      create policy "activity_submissions_admin_select"
        on public.activity_submissions
        for select to authenticated
        using ((select public.is_admin()))
    $p$;
  end if;

  if not exists (
    select 1 from pg_policy
     where polrelid = 'public.activity_submissions'::regclass
       and polname  = 'activity_submissions_admin_update'
  ) then
    execute $p$
      create policy "activity_submissions_admin_update"
        on public.activity_submissions
        for update to authenticated
        using ((select public.is_admin()))
        with check ((select public.is_admin()))
    $p$;
  end if;
end
$mig$;

-- Sama polityka bez GRANT-u to "permission denied" -- GRANT jest idempotentny.
grant select, update on public.activity_submissions to authenticated;

-- ====================================================================
-- 2. DZIENNIK admin_actions
-- ====================================================================

create or replace function public.log_admin_submission_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  -- zapis ze skryptu (service_role, brak sesji) nie jest akcja admina
  if auth.uid() is null then
    return null;
  end if;

  if new.status is not distinct from old.status then
    return null;
  end if;

  insert into public.admin_actions (user_id, action, table_name, row_id, before, after)
  values (
    auth.uid(),
    'status',
    tg_table_name::text,
    new.id,
    jsonb_build_object('status', old.status),
    jsonb_build_object('status', new.status)
  );

  return null;
end;
$function$;

drop trigger if exists trg_admin_actions_activity_submissions on public.activity_submissions;
create trigger trg_admin_actions_activity_submissions
after update on public.activity_submissions
for each row
execute function public.log_admin_submission_status_change();

-- ====================================================================
-- 3. admin_stats -- licznik do badge'a przy zakladce
-- ====================================================================

create or replace function public.admin_stats()
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $function$
  select case when not public.is_admin() then null else jsonb_build_object(
    'total',           (select count(*) from public_activities),
    'widoczne',        (select count(*) from public_activities
                        where published and not admin_hidden),
    'ukryte_admin',    (select count(*) from public_activities where admin_hidden),
    'zdjete_selekcja', (select count(*) from public_activities where not published),
    'featured',        (select count(*) from public_activities where featured),
    'niepewne',        (select count(*) from public_activities
                        where published and not admin_hidden and uncertain),
    'opinie_pending',  (select count(*) from user_reviews where status = 'pending'),
    'zgloszenia_nowe', (select count(*) from issue_reports where status = 'nowe'),
    'propozycje_nowe', (select count(*) from activity_submissions where status = 'nowe'),
    'per_typ', (select coalesce(jsonb_object_agg(type, n), '{}'::jsonb) from
                 (select type, count(*) n from public_activities
                  where published and not admin_hidden group by type) t),
    'per_region', (select coalesce(jsonb_object_agg(region, o), '{}'::jsonb) from
                    (select region, jsonb_build_object(
                       'n',           count(*),
                       'bez_zdjecia', count(*) filter (where image_url is null),
                       'bez_opisu',   count(*) filter (where coalesce(description,'') = ''),
                       'bez_wieku',   count(*) filter (where age_min is null)
                     ) o
                     from public_activities
                     where published and not admin_hidden group by region) t)
  ) end
$function$;

notify pgrst, 'reload schema';
