import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from "react";

/**
 * „Intencja przed logowaniem" — akcja, którą gość próbował wykonać przed
 * otwarciem modalu logowania (serce, „chcę odwiedzić", ocena gwiazdkowa).
 *
 * Intencja jest trzymana w sessionStorage (poza cyklem życia modalu i strony),
 * dzięki czemu przetrwa zarówno odmontowanie modalu po logowaniu e-mailem,
 * jak i pełne przekierowanie OAuth Google. Wygasa po 15 minutach.
 */
export type PendingIntent =
  | { kind: "favorite"; activityId: number; slug?: string }
  | { kind: "wantToVisit"; activityId: number; slug?: string }
  | { kind: "rating"; activityId: number; slug?: string; value: number };

interface StoredIntent {
  intent: PendingIntent;
  ts: number;
}

const STORAGE_KEY = "ff_pending_intent";
const TTL_MS = 15 * 60 * 1000;

function readStored(): PendingIntent | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredIntent;
    if (!parsed?.intent || typeof parsed.ts !== "number" || Date.now() - parsed.ts > TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.intent;
  } catch {
    return null;
  }
}

function writeStored(intent: PendingIntent | null) {
  try {
    if (!intent) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ intent, ts: Date.now() } as StoredIntent));
  } catch {
    /* brak sessionStorage — intencja żyje tylko w pamięci */
  }
}

interface PendingIntentActions {
  setPendingIntent: (intent: PendingIntent) => void;
  /** Bezwarunkowe czyszczenie (po wykonaniu intencji). */
  clearPendingIntent: () => void;
  /** Użytkownik rozpoczął logowanie — nie czyścimy intencji przy zamknięciu modalu. */
  markAuthAttempt: () => void;
  /** Zamknięcie modalu bez próby logowania — intencja przepada. */
  cancelPendingIntent: () => void;
}

/**
 * INP (A1000-P, serce / gwiazdka): akcje i stan to DWA konteksty.
 * Wcześniej był jeden, z `value={{ pendingIntent, ...akcje }}` — nowy obiekt
 * przy każdym renderze providera. `setPendingIntent` (klik serca jako gość)
 * renderował więc KAŻDEGO konsumenta: każdą kartę na liście (24 na
 * /malopolskie) razem z jej modalem logowania, mimo `React.memo`. Karty i modale
 * potrzebują tylko akcji, a te mają stałą tożsamość (`useCallback` z `[]`),
 * więc kontekst akcji nie zmienia się nigdy. Stan czyta tylko
 * `PendingIntentRunner` (`usePendingIntentValue`).
 */
const PendingIntentActionsContext = createContext<PendingIntentActions | undefined>(undefined);
const PendingIntentValueContext = createContext<{ pendingIntent: PendingIntent | null } | undefined>(undefined);

export function PendingIntentProvider({ children }: { children: ReactNode }) {
  const [pendingIntent, setIntent] = useState<PendingIntent | null>(() => readStored());
  const authAttemptedRef = useRef(false);

  const setPendingIntent = useCallback((intent: PendingIntent) => {
    authAttemptedRef.current = false;
    writeStored(intent);
    setIntent(intent);
  }, []);

  const clearPendingIntent = useCallback(() => {
    authAttemptedRef.current = false;
    writeStored(null);
    setIntent(null);
  }, []);

  const markAuthAttempt = useCallback(() => {
    authAttemptedRef.current = true;
  }, []);

  const cancelPendingIntent = useCallback(() => {
    if (authAttemptedRef.current) return;
    writeStored(null);
    setIntent(null);
  }, []);

  const akcje = useMemo(
    () => ({ setPendingIntent, clearPendingIntent, markAuthAttempt, cancelPendingIntent }),
    [setPendingIntent, clearPendingIntent, markAuthAttempt, cancelPendingIntent],
  );
  const stan = useMemo(() => ({ pendingIntent }), [pendingIntent]);

  return (
    <PendingIntentActionsContext.Provider value={akcje}>
      <PendingIntentValueContext.Provider value={stan}>{children}</PendingIntentValueContext.Provider>
    </PendingIntentActionsContext.Provider>
  );
}

/** Akcje intencji (stała tożsamość — konsument nie renderuje się przy zmianie intencji). */
export function usePendingIntent() {
  const ctx = useContext(PendingIntentActionsContext);
  if (!ctx) throw new Error("usePendingIntent must be used within a PendingIntentProvider");
  return ctx;
}

/** Bieżąca intencja — tylko dla tego, kto ją wykonuje (PendingIntentRunner). */
export function usePendingIntentValue() {
  const ctx = useContext(PendingIntentValueContext);
  if (!ctx) throw new Error("usePendingIntentValue must be used within a PendingIntentProvider");
  return ctx.pendingIntent;
}
