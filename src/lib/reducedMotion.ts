/**
 * Systemowe „ogranicz ruch” (prefers-reduced-motion: reduce) dla ruchu sterowanego z JS.
 *
 * Reguła CSS w index.css zeruje animacje i przejścia CSS, ale NIE obejmuje:
 * - jawnego `behavior: "smooth"` w scrollTo/scrollBy/scrollIntoView — wartość podana w JS
 *   wygrywa z CSS `scroll-behavior` (CSSOM View), więc strona i tak przewijała się płynnie;
 * - animacji liczonych w JS: framer-motion (domyślnie reducedMotion="never"; obsługuje to
 *   <MotionConfig reducedMotion="user"> w App.tsx), Leaflet (flyTo, przesunięcia z `animate`,
 *   animacja zoomu, klastry) i Embla (przewijanie zdjęć w galerii).
 *
 * Preferencję czytamy w chwili akcji, więc zmiana ustawienia systemu działa bez przeładowania
 * strony. Wyjątek: opcje mapy i grupy klastrów Leaflet czyta raz, przy tworzeniu mapy.
 * (AF-6-036 / AF-7-028)
 */
const ZAPYTANIE = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia(ZAPYTANIE).matches;
  } catch {
    return false;
  }
}

/**
 * `behavior` dla scrollTo/scrollBy/scrollIntoView: płynnie tylko bez preferencji ograniczenia ruchu.
 * "auto" (nie "instant"), bo starsze Safari odrzucają nieznaną wartość wyjątkiem; przy „ogranicz
 * ruch” reguła CSS i tak wymusza `scroll-behavior: auto`, więc "auto" oznacza skok.
 */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}
