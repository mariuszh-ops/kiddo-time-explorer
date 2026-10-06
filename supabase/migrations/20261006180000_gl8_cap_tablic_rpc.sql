-- Wgrane recznie na prod 06.10.2026 (Supabase SQL Editor, wlasciciel). Ten plik
-- trzyma repo w zgodzie ze stanem bazy; ponowne uruchomienie jest bezpieczne
-- (create or replace + idempotentne granty). Pomiar: audyt_golive/wyniki/GL-8.
--
-- GL-8-004 / GL-8-005 (audyt GOLIVE 06.10): serwerowy cap dlugosci tablic w RPC home.
--
-- PROBLEM (zweryfikowany w zrodle, nie z pamieci)
-- ff_home_match / ff_home_counts / ff_home_list maja `grant execute ... to anon`
-- (migracja 20260912090000:282-284), wiec dowolny anonim moze je wywolac z
-- tablica dowolnej dlugosci. Brak jakiegokolwiek limitu po stronie serwera:
--   * p_tokens[N]      -> N podzapytan `not like` x ~4919 opublikowanych wierszy,
--   * p_types[N]       -> `= any(p_types)` skanuje N elementow na kazdy wiersz,
--   * p_age_buckets[N] -> ff_home_counts robi `cross join lateral` =
--                         N PELNYCH przebiegow ff_home_match. To najmocniejszy
--                         mnoznik: 1000 kubelkow = 1000 skanow katalogu.
-- Jedyny dzisiejszy cap dotyczy stronicowania: `least(p_limit, 200)` w ff_home_list.
--
-- CO ROBI TA MIGRACJA
-- Ucina tablice do dlugosci, ktorych zywy front nigdy nie przekracza:
--   p_tokens      <= 12  (tokenizeQuery() rozbija fraze po bialych znakach;
--                         realnie 1-6 tokenow)
--   p_types       <= 32  (filterOptions.type ma 8 kategorii)
--   p_age_buckets <= 12  (filterOptions.age ma 5 kubelkow)
-- Ciecie jest CICHE (slice tablicy), nie wyjatek: funkcje sa `language sql`,
-- wiec `raise` wymagaloby przepisania na plpgsql, a front nie ma sciezki bledu
-- dla 400 z licznikow. Legalny klient nie zauwazy roznicy; naduzycie dostaje
-- ograniczona odpowiedz zamiast kosztownego skanu.
-- UWAGA na semantyke: dla p_tokens obowiazuje AND po tokenach, wiec obciecie
-- 13. i dalszych tokenow moze oddac WIECEJ wynikow, nie mniej (nigdy nie
-- przepuszcza wiersza ukrytego przez RLS — ta warstwa jest nietknieta).
--
-- NIE ZMIENIA: RLS, grantow (create or replace zachowuje przywileje; granty
-- ponizej sa idempotentne), sygnatur, nazw, kolejnosci sortowania, limitu 200.
--
-- POZA ZAKRESEM (osobne pozycje audytu, swiadomie nietkniete):
--   GL-8-010  token o dlugosci 10000 znakow (cap na DLUGOSC tokenu, nie na liczbe),
--   GL-8-015/019  brak LIMIT w get_map_pins (intencjonalne, kadr zaweza F-17),
--   p_region_centers (jsonb obiekt czytany w ORDER BY, nie tablica).

-- --------------------------------------------------------------------------
-- Rdzen: ff_home_match. ff_home_counts i ff_home_list wolaja go po nazwie,
-- wiec cap na p_tokens/p_types zalapie obie sciezki naraz.
-- Cialo 1:1 z migracji 20260916120000, zmienione TYLKO tam, gdzie pojawia sie
-- slice `[1:12]` / `[1:32]`.
-- --------------------------------------------------------------------------
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
    -- Kategoria (wielokrotny wybor, logika OR wewnatrz wymiaru).
    -- GL-8-004: cap 32 elementy — front wysyla najwyzej 8.
    and (
      coalesce(p_skip, '') = 'type'
      or p_types is null
      or cardinality(p_types[1:32]) = 0
      or a.type = any(p_types[1:32])
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
    -- GL-8-004: cap 12 tokenow — kazdy token to jeden LIKE na kazdy wiersz.
    and (
      p_tokens is null
      or cardinality(p_tokens[1:12]) = 0
      or not exists (
        select 1
        from unnest(p_tokens[1:12]) as t
        where public.ff_norm(
                a.name || ' ' || coalesce(a.city, '') || ' ' ||
                coalesce(a.region, '') || ' ' || coalesce(a.type, '') || ' ' ||
                public.ff_cat_label(a.type)
              ) not like '%' || public.ff_norm(t) || '%'
      )
    );
$fn$;

-- --------------------------------------------------------------------------
-- ff_home_counts: cap na p_age_buckets. To jedyne miejsce, gdzie dlugosc
-- tablicy mnozy sie przez PELNY przebieg ff_home_match (cross join lateral).
-- Cialo 1:1 z produkcji (dump _schema.sql:476-523), zmieniona TYLKO klauzula
-- `from jsonb_to_recordset(...)` w galezi 'age'.
-- --------------------------------------------------------------------------
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
      -- GL-8-005: cap 12 kubelkow. Kazdy kubelek = jeden pelny przebieg
      -- ff_home_match, wiec bez capa 1000 kubelkow = 1000 skanow katalogu.
      from jsonb_to_recordset(
             coalesce((
               select jsonb_agg(e.elem order by e.ord)
               from jsonb_array_elements(coalesce(p_age_buckets, '[]'::jsonb))
                    with ordinality as e(elem, ord)
               where e.ord <= 12
             ), '[]'::jsonb)
           ) as b(value text, min int, max int)
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

-- Granty: `create or replace function` zachowuje przywileje, te linie sa tylko
-- bezpiecznikiem (idempotentne).
grant execute on function public.ff_home_match(
  text, text[], int, int, text[], double precision, double precision, double precision, text
) to anon, authenticated;
grant execute on function public.ff_home_counts(
  text, text[], int, int, text[], double precision, double precision, double precision, jsonb
) to anon, authenticated;
