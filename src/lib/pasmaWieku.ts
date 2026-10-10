// AF-10-017 (decyzja D5 = A): formularz „Zgłoś atrakcję” używa tych samych pasm
// wieku co filtr (0–2 / 3–5 / 6–9 / 10–13 / 14+). Jedno źródło: `filterOptions.age`.
// Wcześniej formularz miał własne pasma (0–3 / 4–6 / 7–10 / 11–14 / 15+), których
// filtr nie znał. Zgłoszenia zapisane po staremu zostają w bazie bez zmian.
import { filterOptions } from "@/data/activities";

export type PasmoWieku = (typeof filterOptions.age)[number];

export const PASMA_WIEKU: readonly PasmoWieku[] = filterOptions.age;

/** Zakres wieku zgłoszenia: od najmłodszego do najstarszego zaznaczonego pasma. */
export function zakresWiekuZPasm(
  ids: readonly string[],
): { ageMin: number; ageMax: number } | null {
  const wybrane = PASMA_WIEKU.filter((p) => ids.includes(p.value));
  if (wybrane.length === 0) return null;
  return {
    ageMin: Math.min(...wybrane.map((p) => p.min)),
    ageMax: Math.max(...wybrane.map((p) => p.max)),
  };
}
