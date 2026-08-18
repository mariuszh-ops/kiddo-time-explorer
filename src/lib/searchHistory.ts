/**
 * Zapisuje aktualną frazę wyszukiwania w BIEŻĄCYM wpisie historii,
 * zanim nastąpi nawigacja na kartę atrakcji. Dzięki temu jedno „wstecz"
 * wraca na listę wyników z wypełnionym polem, a nie na czysty widok.
 *
 * Używa history.replaceState (bez re-renderu Reacta), więc nie tworzy
 * dodatkowego wpisu i nie przerywa nawigacji wykonanej chwilę później.
 */
export function persistSearchInHistory(query: string): void {
  const q = query.trim();
  if (!q) return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("search") === q) return;
    url.searchParams.set("search", q);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  } catch {
    /* brak History API — pomijamy */
  }
}