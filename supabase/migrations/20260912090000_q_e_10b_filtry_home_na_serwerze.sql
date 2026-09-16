-- A1000-Q / Q-E-10b: filtry strony glownej liczone i stronicowane na SERWERZE.
--
-- Tlo. Q-E-10 przepielo sam link „Zobacz wszystkie atrakcje" (/?all=1) na
-- serwerowa paginacje, ale KAZDY filtr na home nadal ciagnal caly katalog do
-- pamieci przegladarki: 4892 wiersze petla po `.range()` co 1000
-- (zmierzone 12.09.2026 na produkcji: 109,3 kB gzip / 450,4 kB raw na 1000
-- wierszy, czyli 534 kB po sieci i 2203 kB po dekompresji na komplet).
-- Powodem nie byla sama siatka, tylko LICZNIKI przy opcjach filtrow
-- (16 wojewodztw + 5 przedzialow wieku + 10 kategorii = 31 osi) — w czystym
-- PostgREST to 31 osobnych zapytan HEAD na kazda zmiane filtra.
--
-- Te funkcje zastepuja oba zastosowania jednym POST-em kazde:
--   ff_home_counts() — kontekstowe liczniki dla wszystkich 31 osi naraz,
--   ff_home_list()   — jedna strona wynikow (domyslnie 24 rekordy).
--
-- Semantyka jest celowo IDENTYCZNA z klientowym useActivityFilters, poza
-- dwoma swiadomie przyjetymi roznicami, opisanymi przy ff_home_match().

-- --------------------------------------------------------------------------
-- Pomocnicze: normalizacja tekstu i odleglosc.
-- --------------------------------------------------------------------------

-- Odpowiednik normalizeSearchText() z src/lib/searchMatch.ts: male litery
-- + zdjecie polskich diakrytykow. Rozszerzenie `unaccent` nie jest wlaczone
-- na tym projekcie, wiec idziemy przez translate() — dla polskiego alfabetu
-- to pelne pokrycie, nie przyblizenie.
create or replace function public.ff_norm(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $fn$
  select translate(lower(coalesce(p_text, '')), 'ąćęłńóśźż', 'acelnoszz');
$fn$;

-- Haversine w km. Ten sam wzor co getDistanceKm() w useActivityFilters.ts,
-- z tym samym promieniem Ziemi 6371 km — dzieki temu suwak „do X km" odcina
-- na serwerze dokladnie te same rekordy co wczesniej na kliencie.
-- Swiadomie NIE uzywamy prostokata (bounding box): przy promieniu 50 km
-- kwadrat wpuszcza w narozniku rekordy o 41 % dalsze, a podpis w UI mowi
-- „w promieniu", nie „w kwadracie".
create or replace function public.ff_km(
  p_lat1 double precision, p_lng1 double precision,
  p_lat2 double precision, p_lng2 double precision
)
returns double precision
language sql
immutable
parallel safe
set search_path = public
as $fn$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(p_lat2 - p_lat1) / 2), 2) +
    cos(radians(p_lat1)) * cos(radians(p_lat2)) *
    power(sin(radians(p_lng2 - p_lng1) / 2), 2)
  ));
$fn$;

-- --------------------------------------------------------------------------
-- Rdzen: jeden zestaw predykatow dla licznikow i dla listy.
-- --------------------------------------------------------------------------
--
-- p_skip wycina JEDEN wymiar z filtrowania. Tak dziala kontekstowy licznik:
-- „ile zostanie, jesli wybiore te opcje" liczy sie przy wszystkich POZOSTALYCH
-- filtrach, ale bez filtra z wlasnego wymiaru (inaczej kazda niewybrana opcja
-- pokazywalaby zero). Dokladnie to robi getCountForFilter() na kliencie.
--
-- Dwie swiadome roznice wobec klienta:
--  1. Wiek: rekordy z age_min i age_max = NULL sa z filtra WYLACZONE (przechodza
--     zawsze) — decyzja M-07 z 04.09.2026, ta sama co w ageRangeOrFilter().
--     Klient mapowal NULL na 0-18, co dawalo ten sam skutek dla wszystkich
--     przedzialow poza „14+".
--  2. Szukajka: stog siana to nazwa + miasto + region + typ. Klientowy
--     haystack doklada jeszcze ETYKIETE kategorii („Parki rozrywki" obok
--     wartosci „park_rozrywki") i etykiete wojewodztwa — ta druga po
--     normalizacji jest rowna slugowi, wiec realna strata to tylko szukanie
--     po polskiej nazwie kategorii.
--     NIEAKTUALNE od 16.09: migracja 20260916120000 doklada do stogu
--     ff_cat_label(a.type), wiec roznicy wobec klienta juz nie ma.
create or replace function public.ff_home_match(
  p_region     text             default null,
  p_types      text[]           default null,
  p_age_min    int              default null,
  p_age_max    int              default null,
  p_tokens     text[]           default null,
  p_radius_km  double precision default null,
  p_center_lat double precision default null,
  p_center_lng double precision default null,
  p_skip       text             default null
)
returns setof public.public_activities
language sql
stable
parallel safe
security invoker
set search_path = public
as $fn$
  select a.*
  from public.public_activities a
  where a.published = true
    -- Wojewodztwo
    and (
      coalesce(p_skip, '') = 'region'
      or p_region is null
      or a.region = p_region
    )
    -- Kategoria (wielokrotny wybor, logika OR wewnatrz wymiaru)
    and (
      coalesce(p_skip, '') = 'type'
      or p_types is null
      or cardinality(p_types) = 0
      or a.type = any(p_types)
    )
    -- Wiek: przecinanie przedzialow, rekordy bez wieku przechodza zawsze (M-07)
    and (
      coalesce(p_skip, '') = 'age'
      or p_age_min is null
      or p_age_max is null
      or (a.age_min is null and a.age_max is null)
      or (a.age_min <= p_age_max and a.age_max >= p_age_min)
    )
    -- Promien od srodka wojewodztwa. Rekord bez wspolrzednych odpada — tak samo
    -- jak na kliencie, gdzie brak lat/lng mapowal sie na (0,0), czyli ~5000 km.
    and (
      p_radius_km is null
      or p_center_lat is null
      or (
        a.lat is not null and a.lng is not null
        and public.ff_km(p_center_lat, p_center_lng, a.lat, a.lng) <= p_radius_km
      )
    )
    -- Fraza: kazdy token musi wystapic w stogu (AND po tokenach, kolejnosc bez znaczenia)
    and (
      p_tokens is null
      or cardinality(p_tokens) = 0
      or not exists (
        select 1
        from unnest(p_tokens) as t
        where public.ff_norm(
                a.name || ' ' || coalesce(a.city, '') || ' ' ||
                coalesce(a.region, '') || ' ' || coalesce(a.type, '')
              ) not like '%' || public.ff_norm(t) || '%'
      )
    );
$fn$;

-- --------------------------------------------------------------------------
-- Liczniki: wszystkie 31 osi + „filtered" + „total" w jednym wywolaniu.
-- --------------------------------------------------------------------------
--
-- p_age_buckets przychodzi z klienta jako [{"value":"0-2","min":0,"max":2}, ...],
-- zeby definicja przedzialow wieku zostala w JEDNYM miejscu (filterOptions.age
-- w src/data/activities.ts) i nie rozjechala sie miedzy frontem a baza.
create or replace function public.ff_home_counts(
  p_region      text             default null,
  p_types       text[]           default null,
  p_age_min     int              default null,
  p_age_max     int              default null,
  p_tokens      text[]           default null,
  p_radius_km   double precision default null,
  p_center_lat  double precision default null,
  p_center_lng  double precision default null,
  p_age_buckets jsonb            default '[]'::jsonb
)
returns jsonb
language sql
stable
parallel safe
security invoker
set search_path = public
as $fn$
  select jsonb_build_object(
    'region', coalesce((
      select jsonb_object_agg(r.region, r.n)
      from (
        select a.region, count(*) as n
        from public.ff_home_match(p_region, p_types, p_age_min, p_age_max,
                                  p_tokens, p_radius_km, p_center_lat, p_center_lng,
                                  'region') a
        group by a.region
      ) r
    ), '{}'::jsonb),
    'type', coalesce((
      select jsonb_object_agg(t.type, t.n)
      from (
        select a.type, count(*) as n
        from public.ff_home_match(p_region, p_types, p_age_min, p_age_max,
                                  p_tokens, p_radius_km, p_center_lat, p_center_lng,
                                  'type') a
        group by a.type
      ) t
    ), '{}'::jsonb),
    'age', coalesce((
      select jsonb_object_agg(b.value, x.n)
      from jsonb_to_recordset(p_age_buckets) as b(value text, min int, max int)
      cross join lateral (
        select count(*) as n
        from public.ff_home_match(p_region, p_types, null, null,
                                  p_tokens, p_radius_km, p_center_lat, p_center_lng,
                                  'age') a
        where (a.age_min is null and a.age_max is null)
           or (a.age_min <= b.max and a.age_max >= b.min)
      ) x
    ), '{}'::jsonb),
    'filtered', (
      select count(*)
      from public.ff_home_match(p_region, p_types, p_age_min, p_age_max,
                                p_tokens, p_radius_km, p_center_lat, p_center_lng,
                                null) a
    ),
    'total', (select count(*) from public.public_activities where published = true)
  );
$fn$;

-- --------------------------------------------------------------------------
-- Lista: jedna strona wynikow.
-- --------------------------------------------------------------------------
--
-- Zwraca `setof public_activities`, ale klient wola to przez
-- `.rpc(...).select(CARD_COLUMNS)` — PostgREST zwezi kolumny po stronie
-- serwera, wiec ciezkie jsonb-y (`reviews`, `experience_points`) NIE ida
-- po sieci.
--
-- p_region_centers to {"malopolskie":{"lat":..,"lng":..}, ...} z src/data/regions.ts
-- — potrzebne wylacznie dla sortowania „Najblizej centrum", ktore mierzy dystans
-- do srodka WLASNEGO wojewodztwa kazdej atrakcji (getDistanceFromRegionCenter).
--
-- Klucze sortowania odwzorowuja <select id="sort-select"> z FilterBar.tsx.
-- Uwaga: „google_rating" i „google_popular" sa w danych tym samym co „rating"
-- i „most_reviewed" — mapCatalogRow przepisuje rating -> google_rating
-- i reviews_count -> google_review_count. Zachowujemy 4 rozne zachowania
-- pod 6 etykietami, tak jak bylo na kliencie.
create or replace function public.ff_home_list(
  p_region         text             default null,
  p_types          text[]           default null,
  p_age_min        int              default null,
  p_age_max        int              default null,
  p_tokens         text[]           default null,
  p_radius_km      double precision default null,
  p_center_lat     double precision default null,
  p_center_lng     double precision default null,
  p_sort           text             default 'rating',
  p_region_centers jsonb            default '{}'::jsonb,
  p_limit          int              default 24,
  p_offset         int              default 0
)
returns setof public.public_activities
language sql
stable
parallel safe
security invoker
set search_path = public
as $fn$
  select a.*
  from public.ff_home_match(p_region, p_types, p_age_min, p_age_max,
                            p_tokens, p_radius_km, p_center_lat, p_center_lng,
                            null) a
  order by
    case when p_sort = 'distance-from-center' then
      public.ff_km(
        (p_region_centers -> a.region ->> 'lat')::double precision,
        (p_region_centers -> a.region ->> 'lng')::double precision,
        a.lat, a.lng
      )
    end asc nulls last,
    case when p_sort = 'name' then public.ff_norm(a.name) end asc,
    case when p_sort in ('most_reviewed', 'google_popular') then a.reviews_count end desc nulls last,
    case when p_sort in ('rating', 'google_rating') then a.rating end desc nulls last,
    case when p_sort in ('rating', 'google_rating') then a.reviews_count end desc nulls last,
    -- Stabilny rozjemca: bez niego dwie strony moglyby powtorzyc lub pominac rekord.
    a.place_id asc
  limit greatest(1, least(coalesce(p_limit, 24), 200))
  offset greatest(0, coalesce(p_offset, 0));
$fn$;

-- Katalog czytany jest anonimowo (RLS: anon SELECT na public_activities).
-- Funkcje sa SECURITY INVOKER, wiec RLS obowiazuje tak samo jak przy zwyklym
-- selekcie — grant tylko odblokowuje wywolanie.
grant execute on function public.ff_norm(text) to anon, authenticated;
grant execute on function public.ff_km(double precision, double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.ff_home_match(text, text[], int, int, text[], double precision, double precision, double precision, text) to anon, authenticated;
grant execute on function public.ff_home_counts(text, text[], int, int, text[], double precision, double precision, double precision, jsonb) to anon, authenticated;
grant execute on function public.ff_home_list(text, text[], int, int, text[], double precision, double precision, double precision, text, jsonb, int, int) to anon, authenticated;
