-- I-06: jeden kanoniczny klucz atrakcji = `slug`.
--
-- Stan przed: ulubione (`saved_activities`) kluczują po `activity_slug`, oceny
-- (`user_ratings`) po `activity_id` (FNV-1a ze sluga liczone w przeglądarce),
-- i po żadnej stronie nie ma klucza obcego do `public_activities`.
-- Pomiar 2026-09-10: sierot ZERO w obu tabelach, kolizji hasza na 6086 slugach ZERO.
--
-- To jest FAZA A+B (kroki 2, 5, 6 planu). NIE zmienia zachowania starego frontu:
-- kolumna dokładana obok, stara unikalność zostaje, stare RPC zostaje żywe.
-- Backfill (krok 3) i faza C (krok 8) idą skryptem `7_public/i06_migracja.py`
-- z repozytorium pipeline'u — backfill wymaga policzenia FNV-1a, którego nie ma w SQL.
--
-- Plan i pomiar: 7_public/out/I06_PLAN_MIGRACJI_2026-09-10.md

-- Krok 2. Nowa kolumna + granty. Granty kolumnowe NIE dziedziczą się na nową
-- kolumnę — bez tego GRANT-u front dostaje 403 na upsercie.
alter table public.user_ratings add column if not exists activity_slug text;
grant select, insert, update (activity_slug) on public.user_ratings to authenticated;

-- Krok 5. Unikalność po nowym kluczu. STARA `user_ratings_user_activity_uniq`
-- zostaje — front na produkcji nadal używa onConflict po `activity_id`.
alter table public.user_ratings drop constraint if exists user_ratings_user_slug_uniq;
alter table public.user_ratings
  add constraint user_ratings_user_slug_uniq unique (user_id, activity_slug);

-- Krok 6. Nowe RPC OBOK starego — baza obsługuje obie wersje frontu naraz,
-- więc rewert commita frontu nie wymaga ruchu w bazie.
create or replace function public.get_activity_rating_by_slug(p_slug text)
returns table(avg_rating numeric, ratings_count integer)
language sql stable security definer set search_path to 'public' as $fn$
  select round(avg(ur.rating)::numeric, 2) as avg_rating,
         count(*)::int                     as ratings_count
  from public.user_ratings ur
  where ur.activity_slug = p_slug;
$fn$;
grant execute on function public.get_activity_rating_by_slug(text) to anon, authenticated;

-- FAZA C (krok 8) — NIE uruchamiać, dopóki nowy front nie jest na produkcji:
--
--   alter table public.user_ratings alter column activity_slug set not null;
--   alter table public.user_ratings
--     add constraint user_ratings_activity_fk foreign key (activity_slug)
--     references public.public_activities(slug) on update cascade on delete cascade;
--   alter table public.saved_activities
--     add constraint saved_activities_activity_fk foreign key (activity_slug)
--     references public.public_activities(slug) on update cascade on delete cascade;
--   alter table public.user_ratings drop constraint user_ratings_user_activity_uniq;
--   alter table public.user_ratings drop column activity_id;
--   drop function public.get_activity_rating(bigint);
--
-- ON UPDATE CASCADE jest obowiązkowe: `publikuj_do_public.py` wysyła `slug`
-- w każdym upsercie po `place_id`, a slug jest pochodną nazwy i miasta — korekta
-- nazwy atrakcji ZMIENIA slug i bez kaskady wywaliłaby publikację na FK.
-- ON DELETE CASCADE jest bezpieczne: reconcile nigdy nie robi DELETE na
-- `public_activities`, tylko PATCH `published=false`.
