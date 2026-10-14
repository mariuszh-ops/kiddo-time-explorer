/**
 * Arkusz listy na mapie mobilnej (MapBottomSheet) i przycisk „Moja lokalizacja”
 * (MapView) dzielą jedną liczbę: wysokość zwiniętego arkusza. Trzymamy ją tu,
 * żeby zmiana wysokości arkusza nie wsunęła znowu przycisku na jego pasek.
 */
export type StanArkusza = "peek" | "half" | "full";

/** Wysokość zwiniętego arkusza (stan „peek”), px. */
export const ARKUSZ_PEEK_PX = 140;

/** Odstęp dolnej krawędzi „Moja lokalizacja” od górnej krawędzi arkusza peek, px. */
export const ODSTEP_LOKALIZACJI_NAD_ARKUSZEM_PX = 12;

/**
 * AN-12-085 (WCAG 2.5.8): wartość CSS `bottom` przycisku „Moja lokalizacja”.
 * Wcześniej w stanie peek było 96 px, czyli przycisk 44x44 leżał na pasku arkusza
 * (140 px) i zasłaniał prawą część „Ocena ↓” (390 px: 24 px wspólnej wysokości).
 * Half i full bez zmian (54% / 92% — nad arkuszem 50% / 90%).
 */
export function dolPrzyciskuLokalizacji(stan: StanArkusza): string {
  if (stan === "peek") return `${ARKUSZ_PEEK_PX + ODSTEP_LOKALIZACJI_NAD_ARKUSZEM_PX}px`;
  return stan === "half" ? "54%" : "92%";
}
