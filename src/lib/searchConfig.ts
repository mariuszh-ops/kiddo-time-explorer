/** Jeden, wspólny placeholder dla wszystkich pól wyszukiwania. */
export const SEARCH_PLACEHOLDER = "Szukaj atrakcji, miasta lub kategorii";

/** Czyści frazę pod filtr `or(...ilike...)` w PostgREST (usuwa znaki sterujące). */
export function sanitizeSearchTerm(q: string): string {
  return q.replace(/[,()%*\\]/g, " ").trim();
}
