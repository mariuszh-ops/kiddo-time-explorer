// FMN-B92: JEDNA reguła frazy dla strony głównej i stron województw/kategorii.
//
// Zmierzone 26.09 (FMN-9) i ponownie 10.10.2026 na produkcji: ta sama fraza
// dawała na „/” inną liczbę niż na stronie województwa, np. „sala zabaw”
// w mazowieckim 136 vs 75, „muzeum” lubelskie 10–13 lat 55 vs 22. Powód:
//   - „/” liczy przez rpc('ff_home_counts' / 'ff_home_list'), których rdzeniem
//     jest `public.ff_home_match`: fraza → słowa (AND), stóg = nazwa + miasto
//     + województwo + typ + polska etykieta kategorii, po `ff_norm` (bez akcentów);
//   - strona województwa miała `name.ilike.%fraza%,city.ilike.%fraza%`: cała
//     fraza dosłownie, tylko nazwa i miasto, z ogonkami; jej mapa — trzecią
//     regułę (`tytuł + miejscowość`.includes).
//
// Teraz przy niepustej frazie bazą zapytania listingu (i zbioru slugów dla mapy)
// jest TEN SAM `ff_home_match` z tymi samymi słowami (`tokenizeQuery`), a pozostałe
// filtry strony (wiek, ocena, udogodnienia, `auto`, `free`, sortowanie, zakres)
// PostgREST nakłada na wynik funkcji tak samo jak na tabelę. Funkcja istnieje
// na produkcji od 16.09 (`grant execute ... to anon`), więc ta zmiana NIE czeka
// na żadną migrację. Migracja FMN-B93 (`ff_norm` bez wszystkich akcentów)
// zmienia wynik obu dróg naraz.
//
// Bez frazy nic się nie zmienia: zwykłe zapytanie o tabelę.
import { catalogClient } from "@/lib/catalogClient";
import { tokenizeQuery } from "@/lib/searchTokens";

export interface ZakresFrazy {
  region?: string;
  type?: string;
  search?: string;
}

/**
 * Początek zapytania o katalog: `select(columns)` z tabeli albo — przy frazie —
 * z `rpc('ff_home_match')`. Zwraca builder, na który dokłada się filtry,
 * sortowanie i zakres jak na zwykłe `from('public_activities').select(...)`.
 *
 * `head` (sam licznik): przy RPC NIE używamy metody HEAD — supabase-js wkłada
 * wtedy tablicę słów do adresu jako `{a,b}`, a przecinek w słowie rozbiłby ją
 * na dwa słowa. Zamiast tego POST z `count=exact` i `limit(1)`.
 */
export function katalogZFraza(
  columns: string,
  { region, type, search }: ZakresFrazy,
  { count, head = false }: { count?: "exact"; head?: boolean } = {},
) {
  const tabela = () =>
    catalogClient
      .from("public_activities")
      .select(columns, head ? { count: count ?? "exact", head: true } : count ? { count } : {});

  const slowa = tokenizeQuery(search ?? "");
  if (slowa.length === 0) return tabela();

  const rpc = catalogClient
    .rpc(
      "ff_home_match",
      { p_region: region ?? null, p_types: type ? [type] : null, p_tokens: slowa },
      head || count ? { count: count ?? "exact" } : {},
    )
    .select(columns);
  // Ten sam builder PostgREST (PostgrestFilterBuilder) — różnią się tylko typy generyczne.
  return (head ? rpc.limit(1) : rpc) as unknown as ReturnType<typeof tabela>;
}
