import { useEffect, useState } from "react";
import { hasFamilyPreferences } from "@/lib/preferences";

/**
 * Czy użytkownik ustawił preferencje rodziny (dziecko z datą urodzenia).
 * Nasłuchuje zmian z innych kart/zakładek, żeby plakietki dopasowania
 * pojawiały się bez przeładowania po zapisie profilu.
 */
export function useFamilyPreferences(): boolean {
  const [hasPrefs, setHasPrefs] = useState<boolean>(() => hasFamilyPreferences());

  useEffect(() => {
    const sync = () => setHasPrefs(hasFamilyPreferences());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return hasPrefs;
}
