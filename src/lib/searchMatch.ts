import { Activity, filterOptions } from "@/data/activities";
import { REGION_BY_SLUG } from "@/data/regions";

/** Małe litery + usunięcie polskich znaków diakrytycznych. */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");
}

/** Rozbija zapytanie na tokeny (po białych znakach) i normalizuje każdy z nich. */
export function tokenizeQuery(query: string): string[] {
  return normalizeSearchText(query)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function categoryLabel(typeValue: string): string {
  return filterOptions.type.find((o) => o.value === typeValue)?.label ?? typeValue;
}

function regionLabel(citySlug: string): string {
  return REGION_BY_SLUG[citySlug]?.label ?? citySlug;
}

/** Połączony tekst atrakcji: nazwa + lokalizacja + miasto + region + kategoria + tagi. */
export function activitySearchHaystack(activity: Activity): string {
  return normalizeSearchText(
    [
      activity.title,
      activity.location,
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