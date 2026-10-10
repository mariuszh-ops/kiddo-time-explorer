-- FMN-B93 (P2) + FMN-B92 (P1): ff_norm() zdejmuje WSZYSTKIE akcenty lacinskie,
-- tak samo jak przegladarka (src/lib/searchTokens.ts: NFD bez znakow laczacych + l z kreska).
--
-- KTO / GDZIE: wgrywa WLASCICIEL recznie w Supabase SQL Editor, projekt zpqpgatnnbojgiejmtpt
-- (instrukcja: B92_B93_INSTRUKCJA.md). Kopia w repo frontu, supabase/migrations/
-- 20261010150000_fmn_b93_ff_norm_wszystkie_akcenty.sql, trzyma historie w zgodzie z baza.
-- Ponowne uruchomienie jest bezpieczne: kontrola na poczatku rozpoznaje stan „juz wgrane".
-- Cofniecie: B92_B93_cofniecie.sql (przywraca stara definicje 1:1).
--
-- PROBLEM (FMN-B93, zmierzone na produkcji 26.09 i 10.10.2026)
-- Stara ff_norm() = translate(lower(x), 'ąćęłńóśźż', 'acelnoszz') zdejmuje tylko polskie
-- ogonki. Przegladarka wysyla slowa frazy bez WSZYSTKICH akcentow, wiec „variete" nigdy nie
-- trafia w „Variété" (rpc ff_home_counts: 0 wynikow nawet dla dokladnie wpisanej nazwy).
-- Dotyczy 7 rekordow: Variété, Cortiqué, Hübnera, Rübartscha, Blüchera, Prüfferowej, Raszòw.
--
-- CO ROBI
-- Tylko ff_norm(). ff_home_match / ff_home_counts / ff_home_list wolaja ja po nazwie, wiec
-- „/" i strony wojewodztw (od FMN-B92 front liczy fraze tez przez ff_home_match) dostaja
-- poprawke naraz i nie moga sie rozjechac.
--   * Szybka droga: tekst zlozony wylacznie z ASCII i polskich liter (4750 z 4861 stogow
--     10.10) idzie DOKLADNIE stara formula — wynik bit w bit jak dzis.
--   * Pozostale (111 stogow: emoji, cudzyslowy, polpauzy, 7 rekordow z akcentami) dostaja
--     translate z mapa 9 polskich + 243 lacinskich liter z akcentem. Mape wygenerowano z
--     funkcji przegladarki (dla kazdej malej litery z U+00C0–U+024F i U+1E00–U+1EFF, ktora
--     przegladarka zamienia na jedna inna litere). Wielkie litery zalatwia lower() przed
--     translate (sprawdzone na prod: lower('ÜÉÒ') = 'üéò').
--   Formalnie: ff_norm(x) = translate(lower(coalesce(x,'')), polskie||lacinskie) dla KAZDEGO x;
--   regex to tylko skrot (na tekscie z samych ASCII i polskich liter dluga mapa nic nie zmienia).
--
-- ZMIERZONE (tylko odczyt na prod, 10.10.2026, wyrazenie wstawione w SELECT bez tworzenia obiektow)
--   * nowa formula = funkcja przegladarki na 4861/4861 stogach katalogu; od starej rozni sie
--     dokladnie na 7 rekordach z listy wyzej;
--   * koszt: +17 ms na pelny skan katalogu na slowo (97 vs 80 ms); bez szybkiej drogi bylo
--     +400 ms (486 ms) — dlatego bramka regex;
--   * frazy z repro FMN-B92 (sala zabaw / zoo / muzeum / Kraków) — liczby bez zmian.
--
-- NIE ZMIENIA: sygnatury, IMMUTABLE, PARALLEL SAFE, search_path, grantow, zadnej tabeli,
-- zadnych danych. Nic w bazie nie zalezy od ff_norm poza cialami funkcji (pg_depend = 0,
-- brak indeksow i kolumn generowanych), wiec nie trzeba niczego przebudowywac.
--
-- POZA ZAKRESEM (backlog K-5 / wiersz #38): kolumna search_norm + pg_trgm. Do zgodnosci
-- „/" i stron wojewodztw nie sa potrzebne.

begin;

-- ---------------------------------------------------------------------------
-- 1. Kontrola stanu wyjsciowego. Inny stan = RAISE EXCEPTION = nic sie nie zmienia.
--    md5 liczone bez znakow CR (definicje na prod maja konce linii z Windows).
-- ---------------------------------------------------------------------------
do $kontrola$
declare
  v_norm  text;
  v_match text;
begin
  select md5(replace(p.prosrc, chr(13), '')) into v_norm
    from pg_proc p where p.oid = 'public.ff_norm(text)'::regprocedure;
  select md5(replace(p.prosrc, chr(13), '')) into v_match
    from pg_proc p where p.oid = 'public.ff_home_match(text, text[], integer, integer, text[], double precision, double precision, double precision, text)'::regprocedure;

  if v_match is distinct from '626d7fd4c5f60e38ba519b5f47b08144' then
    raise exception 'STOP: ff_home_match ma inna definicje niz zbadana 10.10 (md5 %). Nic nie zmieniono.', v_match;
  end if;

  if exists (select 1 from pg_depend d
             where d.refclassid = 'pg_proc'::regclass
               and d.refobjid = 'public.ff_norm(text)'::regprocedure
               and d.deptype in ('n', 'a')) then
    raise exception 'STOP: jakis indeks albo kolumna zalezy od ff_norm. Nic nie zmieniono.';
  end if;

  if v_norm = 'bbda59e551f8f4ac8a5e135e8015b870' then
    raise notice 'OK: stan wyjsciowy (stara ff_norm, tylko polskie litery). Wgrywam.';
  elsif public.ff_norm('Variété Hübnera Raszòw ÉÜ') = 'variete hubnera raszow eu' then
    raise notice 'OK: ta migracja jest juz wgrana. Powtarzam bez zmian w dzialaniu.';
  else
    raise exception 'STOP: ff_norm ma nieznana definicje (md5 %). Nic nie zmieniono.', v_norm;
  end if;
end
$kontrola$;

-- ---------------------------------------------------------------------------
-- 2. Nowa ff_norm (create or replace zachowuje granty; grant nizej to bezpiecznik).
-- ---------------------------------------------------------------------------
create or replace function public.ff_norm(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $fn$
  select case
    -- Szybka droga: same znaki ASCII i polskie litery = dokladnie stara formula.
    when coalesce(p_text, '') !~ '[^\u0001-\u007fąćęłńóśźżĄĆĘŁŃÓŚŹŻ]'
      then translate(lower(coalesce(p_text, '')), 'ąćęłńóśźż', 'acelnoszz')
    -- Inne znaki: polskie + 243 male litery lacinskie z akcentem (mapa z funkcji przegladarki).
    else translate(lower(p_text),
             'ąćęłńóśźż'
             || 'àáâãäåçèéêëìíîïñòôõöùúûüýÿāăĉċč'
             || 'ďēĕėěĝğġģĥĩīĭįĵķĺļľņňōŏőŕŗřŝşšţ'
             || 'ťũūŭůűųŵŷžơưǎǐǒǔǖǘǚǜǟǡǣǧǩǫǭǯǰǵǹ'
             || 'ǻǽǿȁȃȅȇȉȋȍȏȑȓȕȗșțȟȧȩȫȭȯȱȳḁḃḅḇḉḋ'
             || 'ḍḏḑḓḕḗḙḛḝḟḡḣḥḧḩḫḭḯḱḳḵḷḹḻḽḿṁṃṅṇṉ'
             || 'ṋṍṏṑṓṕṗṙṛṝṟṡṣṥṧṩṫṭṯṱṳṵṷṹṻṽṿẁẃẅẇ'
             || 'ẉẋẍẏẑẓẕẖẗẘẙẛạảấầẩẫậắằẳẵặẹẻẽếềểễ'
             || 'ệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ',
             'acelnoszz'
             || 'aaaaaaceeeeiiiinoooouuuuyyaaccc'
             || 'deeeegggghiiiijklllnnooorrrssst'
             || 'tuuuuuuwyzouaiouuuuuaaægkooʒjgn'
             || 'aæøaaeeiioorruusthaeooooyabbbcd'
             || 'ddddeeeeefghhhhhiikkkllllmmmnnn'
             || 'noooopprrrrsssssttttuuuuuvvwwww'
             || 'wxxyzzzhtwyſaaaaaaaaaaaaeeeeeee'
             || 'eiioooooooooooouuuuuuuyyyy')
  end;
$fn$;

grant execute on function public.ff_norm(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Samosprawdzenie PRZED zatwierdzeniem: zly wynik = RAISE = ROLLBACK calosci.
-- ---------------------------------------------------------------------------
do $test$
begin
  if public.ff_norm('Krakowski Teatr Variété') <> 'krakowski teatr variete' then
    raise exception 'STOP (test 1): ff_norm(Variété) = %', public.ff_norm('Krakowski Teatr Variété');
  end if;
  if public.ff_norm('Zażółć GĘŚLĄ jaźń, ŁÓDŹ') <> 'zazolc gesla jazn, lodz' then
    raise exception 'STOP (test 2): polskie litery zmienione: %', public.ff_norm('Zażółć GĘŚLĄ jaźń, ŁÓDŹ');
  end if;
  if public.ff_norm(null) <> '' then
    raise exception 'STOP (test 3): ff_norm(null) <> pusty tekst';
  end if;
  if (select count(*) from public.ff_home_match(p_tokens => array['variete'])) < 1 then
    raise exception 'STOP (test 4): fraza variete nadal nie znajduje Krakowskiego Teatru Variété';
  end if;
end
$test$;

commit;

-- ---------------------------------------------------------------------------
-- 4. SELECT kontrolny (po COMMIT, tylko odczyt). Oczekiwane: KAZDY wiersz ok = true.
--    Liczby w wierszach B93 to rekordy z akcentami spoza polskiego alfabetu,
--    sprawdzone 10.10.2026 (przed migracja: 0, po: 1).
-- ---------------------------------------------------------------------------
select t.nr, t.test, t.wynik, t.oczekiwane, t.wynik = t.oczekiwane as ok
from (values
  (1, 'ff_norm: akcenty spoza polskiego alfabetu',
      public.ff_norm('Krakowski Teatr Variété, Hübnera, Cortiqué, Raszòw, Blüchera'),
      'krakowski teatr variete, hubnera, cortique, raszow, bluchera'),
  (2, 'ff_norm: polskie litery bez zmian',
      public.ff_norm('Zażółć GĘŚLĄ jaźń, ŁÓDŹ'), 'zazolc gesla jazn, lodz'),
  (3, 'ff_norm: interpunkcja i emoji bez zmian (jak w przegladarce)',
      public.ff_norm('Bacówka „Barankowa” – 1000m² 🌟'), 'bacowka „barankowa” – 1000m² 🌟'),
  (4, 'ff_norm: pusta wartosc', public.ff_norm(null), ''),
  (5, 'B93: „variete” (Krakowski Teatr Variété)',
      (select count(*) from public.ff_home_match(p_tokens => array['variete']))::text, '1'),
  (6, 'B93: „hubnera” (Teatr Powszechny im. Hübnera)',
      (select count(*) from public.ff_home_match(p_tokens => array['hubnera']))::text, '1'),
  (7, 'B93: „cortique” (Teatr Cortiqué)',
      (select count(*) from public.ff_home_match(p_tokens => array['cortique']))::text, '1'),
  (8, 'B93: „raszow fiesta” (Stajnia Fiesta, Raszòw)',
      (select count(*) from public.ff_home_match(p_tokens => array['raszow', 'fiesta']))::text, '1'),
  (9, 'B93: „bluchera” (Bunkry Blüchera)',
      (select count(*) from public.ff_home_match(p_tokens => array['bluchera']))::text, '1'),
  (10, 'B93: „rubartscha” (Kamień Rübartscha)',
      (select count(*) from public.ff_home_match(p_tokens => array['rubartscha']))::text, '1'),
  (11, 'B93: „prufferowej” (Muzeum im. Prüfferowej)',
      (select count(*) from public.ff_home_match(p_tokens => array['prufferowej']))::text, '1')
) as t(nr, test, wynik, oczekiwane)
order by t.nr;
