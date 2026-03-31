export const FEATURES = {
  MAP_VIEW: true,            // Widok mapy z pinami — wyłączony w MVP
  DISTANCE_FILTER: true,      // Filtr dystansu — aktywny
  EVENTS: false,              // Wydarzenia (isEvent) — wyłączone w MVP
  MATCH_PERCENTAGE: false,    // Procent dopasowania na kartach — wymaga profilu rodziny
  RATING_HISTOGRAM: false,    // Rozkład ocen (histogram gwiazdek) — wyłączony w MVP (wymaga prawdziwych recenzji)
  RECOMMENDED_BADGE: false,   // Badge "Polecane" na kartach i szczegółach — wyłączony w MVP
  BLOG: true,                 // Sekcja Blog/Inspiracje — aktywna
  UGC_PHOTOS: false,          // Zdjęcia rodziców na stronie atrakcji — ukryte w MVP
  SEARCH_AUTOCOMPLETE: true,  // Dropdown z podpowiedziami w wyszukiwarce — aktywny
  ENABLED_CITIES: ["warszawa", "krakow", "wroclaw", "trojmiasto", "poznan", "slask", "lodz"] as string[],  // Miasta widoczne w UI. Dodawaj kolejne: ["warszawa", "krakow", ...]
  SOCIAL_LINKS: false,        // Linki do social media w stopce — wyłączone w MVP
  ONBOARDING: false,          // Welcome screen dla nowych użytkowników — aktywny
  COLLECTIONS: false,         // Nazwane kolekcje atrakcji — wyłączone w MVP (wymaga backendu do persystencji)
} as const;
