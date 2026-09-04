-- I-03 / E-4 pkt 2: `featured` w admin_stats() liczyl z CALEJ bazy, a stal
-- w dashboardzie obok `niepewne` liczonego tylko z kart widocznych na froncie.
-- Wyrozniona, ale niepublikowana karta podbijalaby kafel w panelu o froncie.
--
-- 1. 'featured' -> ta sama populacja co 'niepewne'/'per_typ'/'per_region':
--    published and not admin_hidden.
-- 2. NOWY klucz 'featured_niewidoczne' - reszta wyroznien nie znika po cichu.
--    Klucz jest DODANY, nie podmieniony, wiec front wdrozony przed Publishem
--    czyta dalej dokladnie to, co czytal.
--
-- Sygnatura bez zmian, wiec `create or replace` podmienia, a nie przeciaza.
--
-- UWAGA: Lovable NIE stosuje migracji wypchnietych gitem. Ten plik jest zapisem
-- zmiany; na bazie puszcza go recznie skrypt
-- `7_public/out/i03_skrypty/i03_admin_stats_featured.py` (repo pipeline'u).

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
    'featured',        (select count(*) from public_activities
                        where published and not admin_hidden and featured),
    'featured_niewidoczne', (select count(*) from public_activities
                             where featured and not (published and not admin_hidden)),
    'niepewne',        (select count(*) from public_activities
                        where published and not admin_hidden and uncertain),
    'opinie_pending',  (select count(*) from user_reviews where status = 'pending'),
    'zgloszenia_nowe', (select count(*) from issue_reports where status = 'nowe'),
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
