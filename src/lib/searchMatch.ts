import { Activity, filterOptions } from "@/data/activities";
import { REGION_BY_SLUG } from "@/data/regions";
import { regionFallbackLabel } from "@/lib/address";
import { normalizeSearchText, tokenizeQuery } from "@/lib/searchTokens";

// Normalizacja mieszka w `searchTokens.ts` (bez zależności od danych, bo
// potrzebuje jej też wczesny start listingu). Tu tylko ją udostępniamy dalej.
export { normalizeSearchText, tokenizeQuery };

function categoryLabel(typeValue: string): string {
  return filterOptions.type.find((o) => o.value === typeValue)?.label ?? typeValue;
}

function regionLabel(citySlug: string): string {
  return REGION_BY_SLUG[citySlug]?.label ?? citySlug;
}

/**
 * Miejscowość do stogu. Gdy miasto jest puste, mapCatalogRow wstawia do `location`
 * etykietę zastępczą „woj. <województwo>” — to tekst ekranu, nie dana. Serwerowe
 * ff_home_match szuka w surowym `city` (wtedy pustym), więc fraza „woj” dawała na mapie
 * 98 wyników, a na liście 49 (M-4-F01, domknięcie 09.10). Etykiety do stogu nie bierzemy.
 */
function searchLocation(activity: Activity): string {
  const loc = activity.location?.trim() ?? "";
  const fallback = regionFallbackLabel(activity.city);
  return fallback && loc === fallback ? "" : loc;
}

/**
 * Połączony tekst atrakcji: nazwa + miejscowość + region + kategoria + tagi.
 * Ma być jeden do jednego ze stogiem ff_home_match (lista), bo mapa filtruje tym na kliencie.
 */
export function activitySearchHaystack(activity: Activity): string {
  return normalizeSearchText(
    [
      activity.title,
      searchLocation(activity),
      activity.city,
      regionLabel(activity.city),
      activity.type,
      categoryLabel(activity.type),
      ...(activity.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

/**
 * Dopasowanie AND po tokenach: każde słowo zapytania musi wystąpić
 * w połączonym tekście atrakcji. Kolejność słów nie ma znaczenia.
 */
export function matchesSearchQuery(activity: Activity, query: string): boolean {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return true;
  const haystack = activitySearchHaystack(activity);
  return tokens.every((t) => haystack.includes(t));
}