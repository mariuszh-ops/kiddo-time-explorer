import { useCallback, useMemo, useRef } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";
import type { SavedMapState } from "@/components/MapView";

/** Leaflet bez jawnego maxZoom tnie kafle na 18; 19 zostawiamy jako zapas. */
const ZOOM_MIN = 3;
const ZOOM_MAX = 19;

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

/**
 * Tryb widoku (lista/mapa) oraz pozycja mapy (center, zoom, chipsy kategorii)
 * trzymane w query params — tak samo jak filtry listingu.
 * Dzięki temu „wstecz" z karty atrakcji, F5 i skopiowany URL odtwarzają ten sam widok.
 */
export function useMapUrlState(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
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
  const rawCats = searchParams.get("cats");

  const savedMapState = useMemo<SavedMapState | null>(() => {
    const lat = liczbaZZakresu(rawLat, -90, 90);
    const lng = liczbaZZakresu(rawLng, -180, 180);
    const zoom = liczbaZZakresu(rawZoom, ZOOM_MIN, ZOOM_MAX);
    if (lat === null || lng === null || zoom === null) return null;
    return {
      center: [lat, lng],
      zoom,
      selectedCategories: new Set(rawCats ? rawCats.split(",").filter(Boolean) : []),
    };
  }, [rawLat, rawLng, rawZoom, rawCats]);

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
      // Nie przywracaj widoku mapy, jeśli adres w przeglądarce już go nie ma
      // (np. klik logo → "/" bez query, a MapView zapisuje stan w unmouncie).
      if (
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("view") !== "map"
      ) {
        return;
      }
      setSearchParams(
        (prev) => {
          if (prev.get("view") !== "map") return prev;
          prev.set("lat", state.center[0].toFixed(5));
          prev.set("lng", state.center[1].toFixed(5));
          prev.set("zoom", String(Math.round(state.zoom)));
          const cats = Array.from(state.selectedCategories);
          if (cats.length) prev.set("cats", cats.join(","));
          else prev.delete("cats");
          return prev;
        },
        { replace: true },
      );
    },
    [setSearchParams, isStillOnThisRoute],
  );

  return { viewMode, setViewMode, savedMapState, handleSaveMapState };
}
