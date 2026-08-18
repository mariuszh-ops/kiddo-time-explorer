import { createContext, useCallback, useContext, useState, ReactNode } from "react";

/**
 * „Intencja przed logowaniem" — akcja, którą gość próbował wykonać przed
 * otwarciem modalu logowania (serce, „chcę odwiedzić", ocena gwiazdkowa).
 *
 * UWAGA: intencja żyje WYŁĄCZNIE w pamięci karty. Nic nie zapisujemy do
 * localStorage ani sessionStorage — po odświeżeniu strony intencja przepada.
 */
export type PendingIntent =
  | { kind: "favorite"; activityId: number; slug?: string }
  | { kind: "wantToVisit"; activityId: number; slug?: string }
  | { kind: "rating"; activityId: number; slug?: string; value: number };

interface PendingIntentContextType {
  pendingIntent: PendingIntent | null;
  setPendingIntent: (intent: PendingIntent) => void;
  clearPendingIntent: () => void;
}

const PendingIntentContext = createContext<PendingIntentContextType | undefined>(undefined);

export function PendingIntentProvider({ children }: { children: ReactNode }) {
  const [pendingIntent, setIntent] = useState<PendingIntent | null>(null);

  const setPendingIntent = useCallback((intent: PendingIntent) => setIntent(intent), []);
  const clearPendingIntent = useCallback(() => setIntent(null), []);

  return (
    <PendingIntentContext.Provider value={{ pendingIntent, setPendingIntent, clearPendingIntent }}>
      {children}
    </PendingIntentContext.Provider>
  );
}

export function usePendingIntent() {
  const ctx = useContext(PendingIntentContext);
  if (!ctx) throw new Error("usePendingIntent must be used within a PendingIntentProvider");
  return ctx;
}