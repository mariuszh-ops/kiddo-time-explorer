/**
 * Zgoda na przeniesienie danych zebranych jako gość na konto (S-184).
 *
 * Migracja NIGDY nie dzieje się automatycznie: kontekst pyta przez
 * `requestGuestMigrationConsent()`, a globalny dialog rozstrzyga jedną
 * decyzją wszystkie oczekujące pytania (miejsca + oceny).
 */

export type GuestMigrationSummary = {
  savedPlaces: number;
  ratings: number;
};

type MigrationKind = keyof GuestMigrationSummary;
type Listener = (summary: GuestMigrationSummary | null) => void;

let listener: Listener | null = null;
let waiting: ((v: boolean) => void)[] = [];
let pending: GuestMigrationSummary = { savedPlaces: 0, ratings: 0 };
let decision: boolean | null = null;

export function subscribeGuestMigration(l: Listener): () => void {
  listener = l;
  if (pending.savedPlaces + pending.ratings > 0) l({ ...pending });
  return () => {
    if (listener === l) listener = null;
  };
}

/** Reset decyzji (np. po wylogowaniu / zmianie konta). */
export function resetGuestMigrationConsent(): void {
  decision = null;
  pending = { savedPlaces: 0, ratings: 0 };
  waiting = [];
  listener?.(null);
}

/** Zapytaj użytkownika o zgodę. Zwraca tę samą decyzję dla wszystkich pytających. */
export function requestGuestMigrationConsent(kind: MigrationKind, count: number): Promise<boolean> {
  if (decision !== null) return Promise.resolve(decision);
  if (count <= 0) return Promise.resolve(false);
  pending = { ...pending, [kind]: pending[kind] + count };
  const promise = new Promise<boolean>((resolve) => waiting.push(resolve));
  listener?.({ ...pending });
  return promise;
}

/** Wywoływane przez dialog: „Dodaj" (true) / „Nie, to nie moje" (false). */
export function resolveGuestMigration(accepted: boolean): void {
  decision = accepted;
  const pendingResolvers = waiting;
  waiting = [];
  pending = { savedPlaces: 0, ratings: 0 };
  listener?.(null);
  pendingResolvers.forEach((resolve) => resolve(accepted));
}
