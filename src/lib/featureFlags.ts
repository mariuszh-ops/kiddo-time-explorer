export const FEATURES = {
  MAP_VIEW: false,            // Widok mapy z pinami — wyłączony w MVP
  DISTANCE_FILTER: true,      // Filtr dystansu — aktywny
  EVENTS: false,              // Wydarzenia (isEvent) — wyłączone w MVP
  MATCH_PERCENTAGE: false,    // Procent dopasowania na kartach — wymaga profilu rodziny
  BLOG: false,                // Sekcja Blog/Inspiracje — ukryta w MVP
} as const;
