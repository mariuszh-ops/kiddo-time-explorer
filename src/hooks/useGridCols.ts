import { useSyncExternalStore } from "react";

/**
 * Liczba kolumn siatki wg progów Tailwinda (lg 1024 → 4, md 768 → 3, sm 640 → 2, niżej 1).
 *
 * INP (A1000-P, chip wieku): wcześniej efekt montażu czytał `window.innerWidth`.
 * Na telefonie (viewport z meta viewport) ten getter wymusza synchroniczny styl
 * i layout, a efekt szedł zaraz po wstawieniu 48 kart — w zadaniu kliku
 * (zmierzone: 45 ms stylu + 57–79 ms layoutu, CPU 4x). `matchMedia` nie czyta
 * geometrii, a te same media queries co CSS siatki dają tę samą liczbę kolumn.
 * `useSyncExternalStore` zwraca prawdziwą wartość od pierwszego renderu (bez
 * startowego 4 i drugiego renderu) i śledzi zmianę rozmiaru okna.
 */
const GRID_QUERIES = ["(min-width: 1024px)", "(min-width: 768px)", "(min-width: 640px)"] as const;
let gridMqls: MediaQueryList[] | null = null;
const getGridMqls = () => (gridMqls ??= GRID_QUERIES.map((q) => window.matchMedia(q)));
const subscribeGridCols = (onChange: () => void) => {
  const mqls = getGridMqls();
  mqls.forEach((m) => m.addEventListener("change", onChange));
  return () => mqls.forEach((m) => m.removeEventListener("change", onChange));
};
export const getGridCols = () => {
  const [lg, md, sm] = getGridMqls();
  return lg.matches ? 4 : md.matches ? 3 : sm.matches ? 2 : 1;
};
const getGridColsServer = () => 4;

/** Return current grid column count based on Tailwind breakpoints */
export const useGridCols = () => useSyncExternalStore(subscribeGridCols, getGridCols, getGridColsServer);
