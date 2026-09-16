-- Q-E-10b, domkniecie: szukanie po POLSKIEJ NAZWIE kategorii.
--
-- Migracja 20260912090000 przeniosla szukajke home na serwer, ale stog siana
-- ograniczyla do nazwa + miasto + region + typ. Typ w bazie to slug
-- („park-rozrywki"), a klient dokladal do stogu jeszcze ETYKIETE z
-- src/data/categoryLabels.ts („Parki rozrywki"). Skutek: fraza „parki rozrywki"
-- oddawala 0 wynikow, choc przed zmiana oddawala cala kategorie.
--
-- Etykieta wojewodztwa luki NIE robi: REGION_BY_SLUG[].label po ff_norm() jest
-- rowne slugowi („Łódzkie" -> „lodzkie"). Tagi tez nie: mapCatalogRow() ustawia
-- tags: [] dla kazdego wiersza katalogu.
--
-- Zrodlo prawdy dla etykiet zostaje w froncie (categoryLabels.ts). Ta funkcja
-- jest jego kopia — przy dopisaniu kategorii trzeba ruszyc OBA miejsca.
-- Etykiety pisze bez ogonkow („zwierzeta" zamiast „zwierzęta") — ff_norm() i tak
-- sciaga diakrytyki po obu stronach porownania, wiec wynik jest identyczny.

create or replace function public.ff_cat_label(p_type text)
returns text
language sql
immutable
parallel safe
security invoker
set search_path = public
as $fn$
  select case p_type
    when 'sala-zabaw'      then 'Sale zabaw'
    when 'plac-zabaw'      then 'Place zabaw'
    when 'park-rozrywki'   then 'Parki rozrywki'
    when 'centra-rozrywki' then 'Centra rozrywki'
    when 'muzeum-teatr'    then 'Muzea i teatry'
    when 'sport'           then 'Sport i ruch'
    when 'zoo'             then 'Zoo i zwierzeta'
    when 'park'            then 'Parki i natura'
    when 'inne'            then 'Inne atrakcje'
    else coalesce(p_type, '')
  end;
$fn$;

grant execute on function public.ff_cat_label(text) to anon, authenticated;

-- Podmiana samego rdzenia. ff_home_counts i ff_home_list wolaja ff_home_match
-- po nazwie, wiec obie sciezki (liczniki i lista) dostaja poprawke naraz
-- i nadal nie moga sie rozjechac.
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
    -- Fraza: kazdy token musi wystapic w stogu (AND po tokenach, kolejnosc bez
    -- znaczenia). Stog = nazwa + miasto + region + typ + ETYKIETA kategorii,
    -- czyli jeden do jednego to, co liczyl activitySearchHaystack() na kliencie.
    and (
      p_tokens is null
      or cardinality(p_tokens) = 0
      or not exists (
        select 1
        from unnest(p_tokens) as t
        where public.ff_norm(
                a.name || ' ' || coalesce(a.city, '') || ' ' ||
                coalesce(a.region, '') || ' ' || coalesce(a.type, '') || ' ' ||
                public.ff_cat_label(a.type)
              ) not like '%' || public.ff_norm(t) || '%'
      )
    );
$fn$;

grant execute on function public.ff_home_match(
  text, text[], int, int, text[], double precision, double precision, double precision, text
) to anon, authenticated;
