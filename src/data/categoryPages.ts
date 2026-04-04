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
    slug: "sala-zabaw",
    emoji: "🏠",
    label: "Sale zabaw",
    seoTitle: "Sale zabaw dla dzieci {city} — ranking rodziców | FamilyFun",
    seoDescription: "Najlepsze sale zabaw {city} ocenione przez rodziców. Sprawdź godziny, ceny, udogodnienia i opinie innych rodzin.",
    h1: "Sale zabaw {city}",
    description: "Ranking sal zabaw ocenionych przez rodziców. Sprawdź, które mają przewijalnie, parking i są dostępne dla wózków.",
    filterFn: (a, citySlug) => a.city === citySlug && a.type === "sala-zabaw",
  },
  {
    slug: "plac-zabaw",
    emoji: "🎪",
    label: "Place zabaw",
    seoTitle: "Place zabaw {city} dla dzieci — ranking rodziców | FamilyFun",
    seoDescription: "Najlepsze place zabaw {city} ocenione przez rodziców. Sprawdź godziny, ceny, udogodnienia i opinie innych rodzin.",
    h1: "Place zabaw {city}",
    description: "Ranking placów zabaw ocenionych przez rodziców. Sprawdź, które mają przewijalnie, parking i są dostępne dla wózków.",
    filterFn: (a, citySlug) => a.city === citySlug && a.type === "plac-zabaw",
  },
  {
    slug: "park-rozrywki",
    emoji: "🎢",
    label: "Parki rozrywki",
    seoTitle: "Parki rozrywki dla dzieci {city} | FamilyFun",
    seoDescription: "Najlepsze parki rozrywki {city} dla dzieci. Sprawdź atrakcje, ceny i opinie rodziców.",
    h1: "Parki rozrywki {city}",
    description: "Parki rozrywki ocenione przez rodziców. Idealne na rodzinne wyjście pełne emocji.",
    filterFn: (a, citySlug) => a.city === citySlug && a.type === "park-rozrywki",
  },
  {
    slug: "muzeum-teatr",
    emoji: "🎭",
    label: "Muzea i teatry",
    seoTitle: "Muzea i teatry dla dzieci {city} | FamilyFun",
    seoDescription: "Najlepsze muzea i teatry dla dzieci {city}. Edukacyjne atrakcje ocenione przez rodziców.",
    h1: "Muzea i teatry {city}",
    description: "Edukacyjne i kulturalne atrakcje dla dzieci. Muzea interaktywne, teatry i wystawy ocenione przez rodziców.",
    filterFn: (a, citySlug) => a.city === citySlug && a.type === "muzeum-teatr",
  },
  {
    slug: "sport",
    emoji: "⚽",
    label: "Sport i ruch",
    seoTitle: "Sport i ruch dla dzieci {city} | FamilyFun",
    seoDescription: "Najlepsze atrakcje sportowe dla dzieci {city}. Parki trampolin, ścianki wspinaczkowe i więcej — ocenione przez rodziców.",
    h1: "Sport i ruch {city}",
    description: "Aktywne atrakcje dla dzieci. Parki trampolin, ścianki wspinaczkowe i inne sportowe miejsca ocenione przez rodziców.",
    filterFn: (a, citySlug) => a.city === citySlug && a.type === "sport",
  },
  {
    slug: "zoo",
    emoji: "🦁",
    label: "Zoo i zwierzęta",
    seoTitle: "Zoo i zwierzęta dla dzieci {city} | FamilyFun",
    seoDescription: "Najlepsze ogrody zoologiczne i atrakcje ze zwierzętami {city}. Sprawdź opinie rodziców.",
    h1: "Zoo i zwierzęta {city}",
    description: "Ogrody zoologiczne, farmy i inne atrakcje ze zwierzętami dla dzieci. Ocenione przez rodziców.",
    filterFn: (a, citySlug) => a.city === citySlug && a.type === "zoo",
  },
  {
    slug: "park",
    emoji: "🌳",
    label: "Parki i natura",
    seoTitle: "Parki i tereny zielone dla dzieci {city} | FamilyFun",
    seoDescription: "Najlepsze parki i tereny zielone {city} dla rodzin z dziećmi. Sprawdź opinie rodziców, udogodnienia i godziny otwarcia.",
    h1: "Parki i natura {city}",
    description: "Parki miejskie, tereny zielone i miejsca na świeżym powietrzu idealne na rodzinne spacery. Ocenione przez rodziców.",
    filterFn: (a, citySlug) => a.city === citySlug && a.type === "park",
  },
  {
    slug: "inne",
    emoji: "✨",
    label: "Inne",
    seoTitle: "Inne atrakcje dla dzieci {city} | FamilyFun",
    seoDescription: "Odkryj unikalne atrakcje dla dzieci {city}. Sprawdzone miejsca ocenione przez rodziców.",
    h1: "Inne atrakcje {city}",
    description: "Unikalne i nietypowe atrakcje dla dzieci. Sprawdzone przez rodziców.",
    filterFn: (a, citySlug) => a.city === citySlug && a.type === "inne",
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
