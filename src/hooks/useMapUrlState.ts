import { useCallback, useEffect, useMemo, useRef } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";
import type { SavedMapState } from "@/components/MapView";
import { CATEGORY_ORDER } from "@/data/categoryLabels";

/**
 * Zakres zoomu, który adres odtwarza (F5, link, „wstecz”). 19 zostaje jako zapas
 * dla starych linków — mapa i tak kończy się na MAPA_MAX_ZOOM.
 * FMN-B61: mapa (MapContainer w MapView) ma minZoom = ZOOM_MIN. Wcześniej dało się
 * oddalić do zoomu 0–2, adres zapisywał taki zoom, a F5 i link go odrzucały
 * (zoom 11 nad Warszawą zamiast mapy Europy).
 */
export const ZOOM_MIN = 3;
export const ZOOM_MAX = 19;
/** Kafle CARTO kończą się na 18 — dalej mapa nie przybliża (MapContainer maxZoom). */
export const MAPA_MAX_ZOOM = 18;

/** Zoom do adresu: zawsze liczba całkowita z zakresu, który adres potem odtworzy. */
export function zoomDoAdresu(zoom: number): string {
  return String(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(zoom))));
}

/**
 * Dlugosc geograficzna do adresu: zawsze w -180..180, ktore adres potem odtworzy.
 * FMN-6-009: Leaflet daje przeciagnac mape za antypoludnik (na kopie swiata obok),
 * a getCenter() oddaje wtedy np. lng 190.48. Taki adres F5 i link odrzucaja
 * (liczbaZZakresu), wiec mapa ladowala na Warszawie z zoomem 11. Ten sam punkt
 * Ziemi to lng - 360 (jak LatLng.wrap() w Leaflecie); wartosc w zakresie zostaje.
 */
export function lngDoAdresu(lng: number): string {
  const wZakresie = lng >= -180 && lng <= 180 ? lng : ((((lng + 180) % 360) + 360) % 360) - 180;
  return wZakresie.toFixed(5);
}

/** Granica rzutu Web Mercator w Leaflecie (L.Projection.SphericalMercator.MAX_LATITUDE). */
export const MAX_LAT_MERCATORA = 85.0511287798;

/**
 * Szerokosc geograficzna do adresu: zawsze w -85,05113..85,05113, czyli tam, gdzie
 * mapa potem ja odtworzy. FMN-6-012: Leaflet daje przeciagnac mape ponad biegun
 * (szary pas nad swiatem), a getCenter() oddaje wtedy np. lat 88.1. Po F5 / linku
 * setView rzutuje srodek z przycieciem do granicy Mercatora, wiec mapa stoi na
 * 85,05113, a adres mowil 88.1 (i czasem sam przepisywal sie na 85,05113).
 */
export function latDoAdresu(lat: number): string {
  return Math.min(MAX_LAT_MERCATORA, Math.max(-MAX_LAT_MERCATORA, lat)).toFixed(5);
}

/**
 * Liczba z query stringa. Pusty parametr, smiec i wartosc poza zakresem
 * znacza BRAK parametru (null), a nie zero: Number("") === 0, wiec
 * `?lat=&lng=&zoom=` wysylalo mape na (0,0) — Zatoka Gwinejska (V-H-06).
 */
function liczbaZZakresu(raw: string | null, min: number, max: number): number | null {
  if (raw === null) return null;
  const tekst = raw.trim();
  if (tekst === "") return null;
  const n = Number(tekst);
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

/** Klucz chipa „Ulubione" w starym ?cats= (FAVORITES_CHIP_KEY z MapCategoryChips). */
const STARY_KLUCZ_ULUBIONYCH = "_favorites";

/**
 * Jak strona trzyma kategorię w adresie:
 * - "wiele"   strona główna, `?type=a,b` (wybór wielokrotny),
 * - "jedna"   strona województwa, `?type=a` (jedna wartość),
 * - "sciezka" kategoria w ścieżce (`/kategoria/zoo`, `/malopolskie/zoo`), `?type=` nic nie zmienia.
 */
export type KategorieWAdresie = "wiele" | "jedna" | "sciezka";

/**
 * FMN-B02: chipy mapy trzymały własną kopię kategorii w `?cats=`, niezależną od
 * `?type=`, i nakładały ją na zbiór już przycięty do `type` (AND). Chip „Zoo" przy
 * `type=plac-zabaw` nie dodawał zoo, a odklik „Place zabaw" dawał 0 pinów.
 * Teraz chip JEST filtrem `type`, a `cats` czytamy wyłącznie ze starych linków:
 * przepisujemy go raz, przy wejściu, tak żeby mapa pokazała to samo co wcześniej.
 *
 * Co pokazywał stary kod:
 * - `cats` działał tylko na mapie z poprawnym lat/lng/zoom (inaczej savedMapState = null),
 * - z `type` w adresie chipy startowały jako type ∪ cats, a zbiór był już przycięty
 *   do `type` — na ekranie były piny `type`. Dlatego `type` wygrywa, `cats` znika,
 * - bez `type` były piny kategorii z `cats`, więc te kategorie idą do `type`,
 * - `_favorites` (chip „Ulubione") przechodzi na `fav=1`.
 *
 * Mutuje `params`; zwraca true, gdy coś zmienił.
 */
export function przepiszStareCats(params: URLSearchParams, tryb: KategorieWAdresie): boolean {
  const raw = params.get("cats");
  if (raw === null || params.get("view") !== "map") return false;
  params.delete("cats");
  const mapaCzytalaCats =
    liczbaZZakresu(params.get("lat"), -90, 90) !== null &&
    liczbaZZakresu(params.get("lng"), -180, 180) !== null &&
    liczbaZZakresu(params.get("zoom"), ZOOM_MIN, ZOOM_MAX) !== null;
  if (!mapaCzytalaCats) return true;
  const wartosci = raw.split(",").filter(Boolean);
  if (wartosci.includes(STARY_KLUCZ_ULUBIONYCH)) params.set("fav", "1");
  const kategorie = wartosci.filter((w) => (CATEGORY_ORDER as readonly string[]).includes(w));
  if (tryb === "sciezka" || kategorie.length === 0 || params.get("type")) return true;
  if (tryb === "wiele") params.set("type", kategorie.join(","));
  // Strona województwa nie ma filtra wielokrotnego: jedną kategorię przenosimy,
  // kilku nie da się wyrazić jednym `type` — zostaje widok bez filtra kategorii.
  else if (kategorie.length === 1) params.set("type", kategorie[0]);
  return true;
}

/**
 * Tryb widoku (lista/mapa) oraz pozycja mapy (center, zoom, chip „Ulubione")
 * trzymane w query params — tak samo jak filtry listingu.
 * Dzięki temu „wstecz" z karty atrakcji, F5 i skopiowany URL odtwarzają ten sam widok.
 * Chipy kategorii NIE mają tu własnego parametru — to filtr `type` strony (FMN-B02).
 */
export function useMapUrlState(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
  kategorieWAdresie: KategorieWAdresie = "wiele",
) {
  // setSearchParams (useNavigate) resolves relatywnie do trasy, w której został
  // wyrenderowany. Gdy MapView zapisuje stan już PO nawigacji (np. klik „Profil"
  // w headerze → cleanup/live-sync w trakcie unmountu), taki zapis cofa
  // użytkownika na listing. Dlatego każdy zapis pomijamy, jeśli ścieżka w
  // przeglądarce nie jest już ścieżką tego widoku.
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const isStillOnThisRoute = useCallback(
    () => typeof window === "undefined" || window.location.pathname === pathnameRef.current,
    [],
  );

  const viewMode: "grid" | "map" = searchParams.get("view") === "map" ? "map" : "grid";

  const rawLat = searchParams.get("lat");
  const rawLng = searchParams.get("lng");
  const rawZoom = searchParams.get("zoom");
  const tylkoUlubione = searchParams.get("fav") === "1";

  const savedMapState = useMemo<SavedMapState | null>(() => {
    const lat = liczbaZZakresu(rawLat, -90, 90);
    const lng = liczbaZZakresu(rawLng, -180, 180);
    const zoom = liczbaZZakresu(rawZoom, ZOOM_MIN, ZOOM_MAX);
    if (lat === null || lng === null || zoom === null) return null;
    return { center: [lat, lng], zoom, favoritesOnly: tylkoUlubione };
  }, [rawLat, rawLng, rawZoom, tylkoUlubione]);

  // Stary link z ?cats= → `type` (+ `fav`), jeden zapis `replace` przy wejściu.
  // To jedyne miejsce, które jeszcze czyta `cats`; nic go już nie zapisuje.
  const maStareCats = viewMode === "map" && searchParams.has("cats");
  useEffect(() => {
    if (!maStareCats || !isStillOnThisRoute()) return;
    setSearchParams(
      (prev) => {
        przepiszStareCats(prev, kategorieWAdresie);
        return prev;
      },
      { replace: true },
    );
    // setSearchParams zmienia tożsamość po każdym zapisie adresu — w zależnościach
    // restartowałby ten efekt. Warunek `maStareCats` gaśnie po pierwszym przepisaniu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maStareCats, kategorieWAdresie]);

  // Przełączenie lista ↔ mapa to świadoma zmiana ekranu → wpis w historii (push).
  const setViewMode = useCallback(
    (mode: "grid" | "map") => {
      if (!isStillOnThisRoute()) return;
      setSearchParams((prev) => {
        if (mode === "map") {
          prev.set("view", "map");
        } else {
          prev.delete("view");
          prev.delete("lat");
          prev.delete("lng");
          prev.delete("zoom");
          prev.delete("fav");
          prev.delete("cats");
        }
        return prev;
      });
    },
    [setSearchParams, isStillOnThisRoute],
  );

  const handleSaveMapState = useCallback(
    (state: SavedMapState) => {
      if (!isStillOnThisRoute()) return;
      if (typeof window !== "undefined") {
        const biezace = new URLSearchParams(window.location.search);
        // Nie przywracaj widoku mapy, jesli adres w przegladarce juz go nie ma
        // (np. klik logo -> "/" bez query, a MapView zapisuje stan w unmouncie).
        if (biezace.get("view") !== "map") return;
        // Zapis BEZ zmiany wartosci i tak wola navigate(): router robi nowa
        // lokalizacje, useSearchParams nowe setSearchParams, a wiec nowa
        // tozsamosc handleSaveMapState. Kazdy efekt trzymajacy ten callback w
        // zaleznosciach (ViewportFilter) odpalal sie wtedy ponownie i zapisywal
        // znowu -- petla ~10 Hz, ktora migotala paskiem filtrow i nie dawala
        // kliknac dropdownu "Kategoria". Identyczny adres = zaden zapis.
        const docelowe = new URLSearchParams(biezace);
        docelowe.set("lat", latDoAdresu(state.center[0]));
        docelowe.set("lng", lngDoAdresu(state.center[1]));
        docelowe.set("zoom", zoomDoAdresu(state.zoom));
        if (state.favoritesOnly) docelowe.set("fav", "1");
        else docelowe.delete("fav");
        if (docelowe.toString() === biezace.toString()) return;
      }
      setSearchParams(
        (prev) => {
          if (prev.get("view") !== "map") return prev;
          prev.set("lat", latDoAdresu(state.center[0]));
          prev.set("lng", lngDoAdresu(state.center[1]));
          prev.set("zoom", zoomDoAdresu(state.zoom));
          if (state.favoritesOnly) prev.set("fav", "1");
          else prev.delete("fav");
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams, isStillOnThisRoute],
  );

  return { viewMode, setViewMode, savedMapState, handleSaveMapState };
}
