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

const NAJSTARSZY = Math.max(...PASMA_WIEKU.map((p) => p.max));

/** Zakres zapisany w identyfikatorze pasma: „4-6” → 4..6, „15+” → 15..najstarszy. */
function zakresZId(id: string): [number, number] | null {
  const od = /^(\d+)\s*[-–]\s*(\d+)$/.exec(id);
  if (od) return [Number(od[1]), Number(od[2])];
  const plus = /^(\d+)\+$/.exec(id);
  if (plus) return [Number(plus[1]), NAJSTARSZY];
  return null;
}

/**
 * Wersja robocza formularza (sessionStorage, do 24 h) mogła powstać przed zmianą
 * pasm, np. `["4-6", "15+"]`. Każde stare pasmo zamieniamy na pasma filtra, które
 * się z nim przecinają (4–6 → 3–5 i 6–9), żeby zaznaczenie było widoczne i dało się
 * je poprawić. Nieznane wartości odpadają. Kolejność = kolejność pasm filtra.
 */
export function pasmaZWersjiRoboczej(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const zakresy = ids
    .filter((id): id is string => typeof id === "string")
    .map(zakresZId)
    .filter((z): z is [number, number] => z !== null);
  return PASMA_WIEKU.filter((p) => zakresy.some(([od, doo]) => p.min <= doo && p.max >= od)).map(
    (p) => p.value,
  );
}
