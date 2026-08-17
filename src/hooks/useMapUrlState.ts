import { useCallback, useMemo, useRef } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import { useLocation } from "react-router-dom";
import type { SavedMapState } from "@/components/MapView";

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
    const lat = rawLat !== null ? Number(rawLat) : NaN;
    const lng = rawLng !== null ? Number(rawLng) : NaN;
    const zoom = rawZoom !== null ? Number(rawZoom) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(zoom)) return null;
    return {
      center: [lat, lng],
      zoom,
      selectedCategories: new Set(rawCats ? rawCats.split(",").filter(Boolean) : []),
    };
  }, [rawLat, rawLng, rawZoom, rawCats]);

  const setViewMode = useCallback(
    (mode: "grid" | "map") => {
      if (!isStillOnThisRoute()) return;
      setSearchParams(
        (prev) => {
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
        },
        { replace: true },
      );
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
