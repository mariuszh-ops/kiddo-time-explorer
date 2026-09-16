import { useEffect, useRef, useState } from "react";
import { catalogClient, mapCatalogRow, CARD_COLUMNS, type CatalogRow } from "@/lib/catalogClient";
import type { Activity } from "@/data/activities";
import { tokenizeQuery } from "@/lib/searchMatch";

/** Poniżej dwóch znaków podpowiedzi i tak nic sensownego nie zwrócą. */
const MIN_ZNAKOW = 2;
const DEBOUNCE_MS = 200;

/**
 * Podpowiedzi wyszukiwarki pobierane z serwera (Q-E-10b).
 *
 * Wcześniej HomeSearch i SearchAutocomplete filtrowały `getActivities()`, czyli
 * pierwsze wpisane znaki ściągały CAŁY katalog (4892 wiersze, 534 kB po sieci)
 * tylko po to, żeby pokazać 5 wierszy podpowiedzi. Teraz leci jedno zapytanie
 * z limitem, tą samą funkcją co siatka wyników — więc podpowiedź i wynik
 * wyszukiwania nie mogą się rozjechać.
 */
export function useActivitySuggestions(query: string, limit = 5): Activity[] {
  const [podpowiedzi, setPodpowiedzi] = useState<Activity[]>([]);
  // Numer ostatniego zapytania — odpowiedzi spóźnione po zmianie frazy odpadają.
  const numerRef = useRef(0);

  useEffect(() => {
    const tokeny = tokenizeQuery(query);
    if (query.trim().length < MIN_ZNAKOW || tokeny.length === 0) {
      setPodpowiedzi([]);
      return;
    }

    const numer = ++numerRef.current;
    const id = setTimeout(() => {
      void (async () => {
        const { data, error } = await catalogClient
          .rpc("ff_home_list", {
            p_tokens: tokeny,
            // Najwięcej ocen = najbardziej rozpoznawalne miejsca na górze listy.
            p_sort: "most_reviewed",
            p_limit: limit,
            p_offset: 0,
          })
          .select(CARD_COLUMNS);
        if (numer !== numerRef.current) return;
        if (error) {
          setPodpowiedzi([]);
          return;
        }
        const rows = (data as unknown as CatalogRow[] | null) ?? [];
        setPodpowiedzi(rows.map((r, i) => mapCatalogRow(r, i)));
      })();
    }, DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [query, limit]);

  return podpowiedzi;
}
