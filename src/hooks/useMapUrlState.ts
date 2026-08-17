import { useCallback, useMemo } from "react";
import type { SetURLSearchParams } from "react-router-dom";
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
    [setSearchParams],
  );

  const handleSaveMapState = useCallback(
    (state: SavedMapState) => {
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
    [setSearchParams],
  );

  return { viewMode, setViewMode, savedMapState, handleSaveMapState };
}
