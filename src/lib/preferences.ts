import { getItem, STORAGE_KEYS } from "@/lib/storage";

/**
 * S-114: plakietka „X% dopasowania" ma sens tylko wtedy, gdy użytkownik
 * ustawił preferencje (dodał dziecko z datą urodzenia). Bez nich pokazujemy
 * odnośnik do ustawień, a nie mylące „0%".
 */
export function hasFamilyPreferences(): boolean {
  const children = getItem<Array<{ birthDate?: string }>>(STORAGE_KEYS.FAMILY_PROFILE, []);
  return Array.isArray(children) && children.some((c) => !!c?.birthDate);
}
