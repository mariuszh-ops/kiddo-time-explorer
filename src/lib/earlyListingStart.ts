// Wczesny start zapytania o pierwszą stronę listingu — MODUŁ Z EFEKTEM UBOCZNYM.
//
// Importuje go WYŁĄCZNIE `main.tsx`, jako PIERWSZY import w pliku: moduły
// ewaluują się w kolejności importów, więc zapytanie wychodzi zanim zewaluuje
// się graf Reacta (a tym bardziej zanim dojadą leniwe chunki trasy).
// Wydzielone z `listingQuery.ts` właśnie po to, żeby sam import współdzielonego
// budowniczego zapytania (hook, testy) nikomu nie wysyłał żądania do bazy.
//
// Dlaczego to jest cała poprawka blokera 2 z A1000-P: patrz komentarz na górze
// `listingQuery.ts` (1202 ms bezczynności sieci między końcem JS a startem REST).
import {
  buildListingQuery,
  listingFilterKey,
  listingFromUrl,
  stashEarlyListing,
  clearEarlyListing,
  LISTING_PAGE_SIZE,
} from "@/lib/listingQuery";

export function startEarlyListing(): void {
  if (typeof window === "undefined") return;
  let filters: ReturnType<typeof listingFromUrl>;
  try {
    filters = listingFromUrl(window.location.pathname, window.location.search);
  } catch {
    return;
  }
  if (!filters) return;

  try {
    const key = listingFilterKey(filters);
    // Pierwsza strona z licznikiem — dokładnie to zapytanie wysyła hook przy
    // wejściu na czysty adres listingu (`isInitialFetch`, page 0).
    // `Promise.resolve` — builder Postgrest jest tylko `PromiseLike`, a skrzynka
    // trzyma zwykla obietnice (hook robi na niej `await`).
    const wynik = Promise.resolve(
      buildListingQuery(filters, { withCount: true }).range(0, LISTING_PAGE_SIZE - 1),
    ).then(
        (r) => r as { data: unknown; count: number | null; error: unknown },
        (e) => {
          // Sieć padła zanim hook zdążył odebrać — niech pyta po swojemu
          // (skrzynka jest już pusta, jeśli zdążył odebrać wcześniej).
          clearEarlyListing();
          throw e;
        },
      );
    stashEarlyListing(key, 0, wynik);
  } catch {
    // Cokolwiek tu padnie, strona ma działać jak dotąd — hook wyśle swoje zapytanie.
    clearEarlyListing();
  }
}

startEarlyListing();
