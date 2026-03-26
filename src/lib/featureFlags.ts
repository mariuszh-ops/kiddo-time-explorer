export const FEATURES = {
  MAP_VIEW: false,            // Widok mapy z pinami — wyłączony w MVP
  DISTANCE_FILTER: true,      // Filtr dystansu — aktywny
  EVENTS: false,              // Wydarzenia (isEvent) — wyłączone w MVP
  MATCH_PERCENTAGE: false,    // Procent dopasowania na kartach — wymaga profilu rodziny
  RATING_HISTOGRAM: false,    // Rozkład ocen (histogram gwiazdek) — wyłączony w MVP (wymaga prawdziwych recenzji)
  RECOMMENDED_BADGE: false,   // Badge "Polecane" na kartach i szczegółach — wyłączony w MVP
  BLOG: true,                 // Sekcja Blog/Inspiracje — aktywna
  UGC_PHOTOS: false,          // Zdjęcia rodziców na stronie atrakcji — ukryte w MVP
  SEARCH_AUTOCOMPLETE: false, // Dropdown z podpowiedziami w wyszukiwarce — wyłączony w MVP
  ENABLED_CITIES: ["warszawa"] as string[],  // Miasta widoczne w UI. Dodawaj kolejne: ["warszawa", "krakow", ...]
  SOCIAL_LINKS: false,        // Linki do social media w stopce — wyłączone w MVP
  ONBOARDING: false,          // Welcome screen dla nowych użytkowników — wyłączony w MVP
  COLLECTIONS: false,         // Nazwane kolekcje atrakcji — wyłączone w MVP (wymaga backendu do persystencji)
} as const;
