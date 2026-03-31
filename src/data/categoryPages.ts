import { Activity } from "@/data/activities";

export const cityLabels: Record<string, { nominative: string; locative: string }> = {
  warszawa: { nominative: "Warszawa i okolice", locative: "Warszawie i okolicach" },
  krakow: { nominative: "Kraków i okolice", locative: "Krakowie i okolicach" },
  wroclaw: { nominative: "Wrocław i okolice", locative: "Wrocławiu i okolicach" },
  trojmiasto: { nominative: "Trójmiasto", locative: "Trójmieście" },
  poznan: { nominative: "Poznań i okolice", locative: "Poznaniu i okolicach" },
  slask: { nominative: "Aglomeracja Śląska", locative: "Aglomeracji Śląskiej" },
  lodz: { nominative: "Łódź i okolice", locative: "Łodzi i okolicach" },
};

export interface CategoryConfig {
  slug: string;
  emoji: string;
  label: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  description: string;
  filterFn: (activity: Activity, citySlug: string) => boolean;
}

// {city} placeholder is replaced with "w {locative}" form at runtime
export const categoryConfigs: CategoryConfig[] = [
  {
    slug: "",
    emoji: "📍",
    label: "Wszystkie atrakcje",
    seoTitle: "Atrakcje dla dzieci {city} — sprawdzone przez rodziców | FamilyFun",
    seoDescription: "Odkryj najlepsze atrakcje dla dzieci {city}. Place zabaw, muzea, parki trampolin i więcej. Opinie i oceny od rodziców, godziny otwarcia, ceny.",
    h1: "Atrakcje dla dzieci {city}",
    description: "Sprawdzone miejsca na wspólny czas z dzieckiem {city}. Każda atrakcja oceniona przez rodziców — znajdź idealną na dziś.",
    filterFn: (a, citySlug) => a.city === citySlug,
  },
  {
    slug: "indoor",
    emoji: "🏠",
    label: "Indoor",
    seoTitle: "Atrakcje indoor dla dzieci {city} — co robić kiedy pada | FamilyFun",
    seoDescription: "Pada deszcz? Sprawdź najlepsze atrakcje w pomieszczeniu dla dzieci {city}. Sale zabaw, muzea, warsztaty — sprawdzone przez rodziców.",
    h1: "Atrakcje indoor — co robić z dzieckiem kiedy pada?",
    description: "Deszczowy dzień nie musi oznaczać nudy. Oto sprawdzone atrakcje w pomieszczeniu dla rodzin z dziećmi {city}.",
    filterFn: (a, citySlug) => a.city === citySlug && a.isIndoor === true,
  },
  {
    slug: "dla-maluchow",
    emoji: "👶",
    label: "Dla maluchów",
    seoTitle: "Atrakcje dla maluchów (0–4 lata) {city} | FamilyFun",
    seoDescription: "Szukasz atrakcji dla malucha {city}? Sprawdzone miejsca dla dzieci 0-4 lata — bezpieczne, dostosowane, ocenione przez rodziców.",
    h1: "Atrakcje dla maluchów (0–4 lata) {city}",
    description: "Miejsca przyjazne najmłodszym — bezpieczne, z przewijalniami, dostępne dla wózków. Sprawdzone przez rodziców maluchów.",
    filterFn: (a, citySlug) => a.city === citySlug && a.ageMin <= 4,
  },
  {
    slug: "na-weekend",
    emoji: "🌟",
    label: "Na weekend",
    seoTitle: "Co robić z dzieckiem w weekend {city} — pomysły | FamilyFun",
    seoDescription: "Planujesz weekend z dzieckiem {city}? Najlepiej oceniane atrakcje rodzinne — place zabaw, parki, muzea. Inspiracje na wspólny czas.",
    h1: "Pomysły na weekend z dzieckiem {city}",
    description: "Najlepiej oceniane atrakcje na rodzinny weekend. Wybierz idealną aktywność dla swojej rodziny.",
    filterFn: (a, citySlug) => a.city === citySlug,
  },
  {
    slug: "place-zabaw",
    emoji: "🎪",
    label: "Place zabaw",
    seoTitle: "Place zabaw {city} dla dzieci — ranking rodziców | FamilyFun",
    seoDescription: "Najlepsze place zabaw {city} ocenione przez rodziców. Sprawdź godziny, ceny, udogodnienia i opinie innych rodzin.",
    h1: "Place zabaw {city}",
    description: "Ranking placów zabaw ocenionych przez rodziców. Sprawdź, które mają przewijalnie, parking i są dostępne dla wózków.",
    filterFn: (a, citySlug) => a.city === citySlug && (a.type === "plac-zabaw" || a.tags.some(t => t.toLowerCase().includes("plac zabaw"))),
  },
  {
    slug: "za-darmo",
    emoji: "🆓",
    label: "Za darmo",
    seoTitle: "Darmowe atrakcje dla dzieci {city} | FamilyFun",
    seoDescription: "Szukasz darmowych atrakcji dla dzieci {city}? Sprawdź bezpłatne place zabaw, parki i muzea — ocenione przez rodziców.",
    h1: "Darmowe atrakcje dla dzieci {city}",
    description: "Wspólny czas z dzieckiem nie musi kosztować. Oto najlepsze bezpłatne atrakcje {city}.",
    filterFn: (a, citySlug) => a.city === citySlug && a.priceLevel === 0,
  },
  {
    slug: "atrakcje-rodzinne",
    emoji: "👨‍👩‍👧‍👦",
    label: "Atrakcje rodzinne",
    seoTitle: "Atrakcje rodzinne {city} — pomysły na czas z rodziną | FamilyFun",
    seoDescription: "Najlepsze atrakcje rodzinne {city}. Sprawdzone miejsca na wspólne wyjście z dziećmi — oceny, ceny, udogodnienia. Znajdź coś dla siebie.",
    h1: "Atrakcje rodzinne {city}",
    description: "Sprawdzone pomysły na wspólny czas z rodziną. Każde miejsce ocenione przez rodziców — od placów zabaw po muzea i parki.",
    filterFn: (a, citySlug) => a.city === citySlug,
  },
];

export function resolveCityText(template: string, citySlug: string): string {
  const city = cityLabels[citySlug];
  if (!city) return template.replace(/\{city\}/g, "");
  return template.replace(/\{city\}/g, `w ${city.locative}`);
}

export function getCategoryConfig(categorySlug?: string): CategoryConfig | undefined {
  if (!categorySlug) return categoryConfigs[0]; // city main page
  return categoryConfigs.find(c => c.slug === categorySlug);
}

export function getCategoryActivities(activities: Activity[], citySlug: string, categorySlug?: string): Activity[] {
  const config = getCategoryConfig(categorySlug);
  if (!config) return [];
  
  let result = activities.filter(a => config.filterFn(a, citySlug));
  
  // "na-weekend" sorts by rating desc
  if (categorySlug === "na-weekend") {
    result.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.reviewCount - a.reviewCount;
    });
  } else {
    result.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.reviewCount - a.reviewCount;
    });
  }
  
  return result;
}

/** Get count of activities matching a category for a given city */
export function getCategoryCount(activities: Activity[], citySlug: string, config: CategoryConfig): number {
  return activities.filter(a => config.filterFn(a, citySlug)).length;
}
