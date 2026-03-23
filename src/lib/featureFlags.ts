export const FEATURES = {
  MAP_VIEW: false,            // Widok mapy z pinami — wyłączony w MVP
  DISTANCE_FILTER: true,      // Filtr dystansu — aktywny
  EVENTS: false,              // Wydarzenia (isEvent) — wyłączone w MVP
  MATCH_PERCENTAGE: false,    // Procent dopasowania na kartach — wymaga profilu rodziny
  RATING_HISTOGRAM: false,    // Rozkład ocen (histogram gwiazdek) — wyłączony w MVP (wymaga prawdziwych recenzji)
  BLOG: false,                // Sekcja Blog/Inspiracje — ukryta w MVP
  UGC_PHOTOS: false,          // Zdjęcia rodziców na stronie atrakcji — ukryte w MVP
  SEARCH_AUTOCOMPLETE: false, // Dropdown z podpowiedziami w wyszukiwarce — wyłączony w MVP
  MULTI_CITY: false,          // Wiele miast — wyłączone w MVP (tylko Warszawa)
  SOCIAL_LINKS: false,        // Linki do social media w stopce — wyłączone w MVP
  ONBOARDING: false,          // Welcome screen dla nowych użytkowników — wyłączony w MVP
} as const;
