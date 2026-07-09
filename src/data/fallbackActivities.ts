import { Activity } from "./activities";
import data from "./fallbackActivities.json";
import { LEGACY_CITY_TO_REGION } from "@/data/regions";

// Fallback ma jeszcze stare slugi miast — normalizujemy do slugów województw,
// żeby wpasowały się w bieżącą listę ENABLED_CITIES (16 województw).
export const fallbackActivities: Activity[] = (data as Activity[]).map((a) => ({
  ...a,
  city: LEGACY_CITY_TO_REGION[a.city] ?? a.city,
}));
