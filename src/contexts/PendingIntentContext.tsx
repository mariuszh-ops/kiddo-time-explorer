import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";

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

interface PendingIntentContextType {
  pendingIntent: PendingIntent | null;
  setPendingIntent: (intent: PendingIntent) => void;
  /** Bezwarunkowe czyszczenie (po wykonaniu intencji). */
  clearPendingIntent: () => void;
  /** Użytkownik rozpoczął logowanie — nie czyścimy intencji przy zamknięciu modalu. */
  markAuthAttempt: () => void;
  /** Zamknięcie modalu bez próby logowania — intencja przepada. */
  cancelPendingIntent: () => void;
}

const PendingIntentContext = createContext<PendingIntentContextType | undefined>(undefined);

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

  return (
    <PendingIntentContext.Provider
      value={{ pendingIntent, setPendingIntent, clearPendingIntent, markAuthAttempt, cancelPendingIntent }}
    >
      {children}
    </PendingIntentContext.Provider>
  );
}

export function usePendingIntent() {
  const ctx = useContext(PendingIntentContext);
  if (!ctx) throw new Error("usePendingIntent must be used within a PendingIntentProvider");
  return ctx;
}
