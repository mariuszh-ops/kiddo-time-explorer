/**
 * Jedno źródło etykiet 9 kategorii.
 *
 * Ta sama nazwa musi się pojawić na chipach mapy, w selekcie listingu,
 * w dropdownie na stronie głównej i w `h1` strony kategorii — audyt 400
 * (BA-H-08) znalazł 5 rozjazdów, bo `MapCategoryChips` miał własną listę.
 * Etykiety zgadzają się z `h1` z `categoryPages.ts` (stąd „Inne atrakcje”,
 * nie „Inne”).
 */
export const CATEGORY_ORDER = [
  "sala-zabaw",
  "plac-zabaw",
  "park-rozrywki",
  "centra-rozrywki",
  "muzeum-teatr",
  "sport",
  "zoo",
  "park",
  "inne",
] as const;

export type CategorySlug = (typeof CATEGORY_ORDER)[number];

export const CATEGORY_LABELS: Record<string, string> = {
  "sala-zabaw": "Sale zabaw",
  "plac-zabaw": "Place zabaw",
  "park-rozrywki": "Parki rozrywki",
  "centra-rozrywki": "Centra rozrywki",
  "muzeum-teatr": "Muzea i teatry",
  sport: "Sport i ruch",
  zoo: "Zoo i zwierzęta",
  park: "Parki i natura",
  inne: "Inne atrakcje",
};

/** Emoji chipów mapy — kolejność i nazwy biorą się z listy wyżej. */
export const CATEGORY_EMOJI: Record<string, string> = {
  "sala-zabaw": "🎠",
  "plac-zabaw": "🛝",
  "park-rozrywki": "🎢",
  "centra-rozrywki": "🎮",
  "muzeum-teatr": "🎭",
  sport: "⚽",
  zoo: "🦁",
  park: "🌳",
  inne: "📌",
};

/** Gotowa lista `{ value, label }` dla filtrów (select listingu, dropdown na /). */
export const CATEGORY_TYPE_OPTIONS: { value: string; label: string }[] =
  CATEGORY_ORDER.map((value) => ({ value, label: CATEGORY_LABELS[value] }));
