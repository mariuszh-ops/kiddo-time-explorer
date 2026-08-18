/**
 * Zgoda na przeniesienie danych zebranych jako gość na konto (S-184).
 *
 * Migracja NIGDY nie dzieje się automatycznie: kontekst pyta przez
 * `requestGuestMigrationConsent()`, a globalny dialog rozstrzyga jedną
 * decyzją wszystkie oczekujące pytania (miejsca + oceny).
 */

type Listener = (count: number | null) => void;

let listener: Listener | null = null;
let waiting: ((v: boolean) => void)[] = [];
let pendingCount = 0;
let decision: boolean | null = null;

export function subscribeGuestMigration(l: Listener): () => void {
  listener = l;
  if (pendingCount > 0) l(pendingCount);
  return () => {
    if (listener === l) listener = null;
  };
}

/** Reset decyzji (np. po wylogowaniu / zmianie konta). */
export function resetGuestMigrationConsent(): void {
  decision = null;
  pendingCount = 0;
  waiting = [];
  listener?.(null);
}

/** Zapytaj użytkownika o zgodę. Zwraca tę samą decyzję dla wszystkich pytających. */
export function requestGuestMigrationConsent(count: number): Promise<boolean> {
  if (decision !== null) return Promise.resolve(decision);
  if (count <= 0) return Promise.resolve(false);
  pendingCount += count;
  const promise = new Promise<boolean>((resolve) => waiting.push(resolve));
  listener?.(pendingCount);
  return promise;
}

/** Wywoływane przez dialog: „Dodaj" (true) / „Nie, to nie moje" (false). */
export function resolveGuestMigration(accepted: boolean): void {
  decision = accepted;
  const pending = waiting;
  waiting = [];
  pendingCount = 0;
  listener?.(null);
  pending.forEach((resolve) => resolve(accepted));
}
