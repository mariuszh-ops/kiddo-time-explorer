// Jedno źródło prawdy dla 16 województw. Slug regionu = wartość kolumny
// `region` w Supabase (public_activities).

export interface Region {
  slug: string;              // slug województwa (matches Supabase region column)
  label: string;             // Nazwa nominatywna, np. "Mazowieckie"
  subtitle: string;          // Podtytuł ze stolicą, np. "Warszawa i okolice"
  locative: string;          // Odmiana miejscownikowa, np. "Mazowieckiem" — używane w SEO ("w …")
  genitive: string;          // Odmiana dopełniaczowa, np. "Mazowieckiego" — używane w podpisach
  capitalCity: string;       // Stolica województwa (nominatyw), np. "Warszawa"
  capitalCityGenitive: string; // Dopełniacz stolicy, np. "Warszawy" — używane w "od centrum …"
  center: { lat: number; lng: number }; // Współrzędne stolicy — do filtrów dystansu i sortowania
  emoji: string;             // Emotka do kafelka na home
  bg: string;                // Kolor tła kafelka
}

export const REGIONS: Region[] = [
  { slug: "dolnoslaskie",       label: "Dolnośląskie",       subtitle: "Wrocław i okolice",             locative: "Dolnośląskiem",       genitive: "Dolnośląskiego",       capitalCity: "Wrocław", capitalCityGenitive: "Wrocławia",       center: { lat: 51.1079, lng: 17.0385 }, emoji: "🤴", bg: "#E4EEF5" },
  { slug: "kujawsko-pomorskie", label: "Kujawsko-Pomorskie", subtitle: "Bydgoszcz, Toruń i okolice",    locative: "Kujawsko-Pomorskiem", genitive: "Kujawsko-Pomorskiego", capitalCity: "Bydgoszcz", capitalCityGenitive: "Bydgoszczy",      center: { lat: 53.1235, lng: 18.0084 }, emoji: "🏛️", bg: "#E8F0E4" },
  { slug: "lubelskie",          label: "Lubelskie",          subtitle: "Lublin i okolice",              locative: "Lubelskiem",          genitive: "Lubelskiego",          capitalCity: "Lublin", capitalCityGenitive: "Lublina",         center: { lat: 51.2465, lng: 22.5684 }, emoji: "🌾", bg: "#F2EBDD" },
  { slug: "lubuskie",           label: "Lubuskie",           subtitle: "Zielona Góra, Gorzów i okolice", locative: "Lubuskiem",          genitive: "Lubuskiego",           capitalCity: "Zielona Góra", capitalCityGenitive: "Zielonej Góry",   center: { lat: 51.9356, lng: 15.5062 }, emoji: "🍇", bg: "#E6EDDF" },
  { slug: "lodzkie",            label: "Łódzkie",            subtitle: "Łódź i okolice",                locative: "Łódzkiem",            genitive: "Łódzkiego",            capitalCity: "Łódź", capitalCityGenitive: "Łodzi",           center: { lat: 51.7592, lng: 19.4560 }, emoji: "🎬", bg: "#DFF0EC" },
  { slug: "malopolskie",        label: "Małopolskie",        subtitle: "Kraków i okolice",              locative: "Małopolsce",          genitive: "Małopolski",           capitalCity: "Kraków", capitalCityGenitive: "Krakowa",         center: { lat: 50.0647, lng: 19.9450 }, emoji: "🐉", bg: "#DFF0EC" },
  { slug: "mazowieckie",        label: "Mazowieckie",        subtitle: "Warszawa i okolice",            locative: "Mazowieckiem",        genitive: "Mazowieckiego",        capitalCity: "Warszawa", capitalCityGenitive: "Warszawy",        center: { lat: 52.2297, lng: 21.0122 }, emoji: "🧜‍♀️", bg: "#E8F0E4" },
  { slug: "opolskie",           label: "Opolskie",           subtitle: "Opole i okolice",               locative: "Opolskiem",           genitive: "Opolskiego",           capitalCity: "Opole", capitalCityGenitive: "Opola",           center: { lat: 50.6751, lng: 17.9213 }, emoji: "🏰", bg: "#E4EEF5" },
  { slug: "podkarpackie",       label: "Podkarpackie",       subtitle: "Rzeszów i okolice",             locative: "Podkarpaciu",         genitive: "Podkarpacia",          capitalCity: "Rzeszów", capitalCityGenitive: "Rzeszowa",        center: { lat: 50.0413, lng: 21.9990 }, emoji: "⛰️", bg: "#F2EBDD" },
  { slug: "podlaskie",          label: "Podlaskie",          subtitle: "Białystok i okolice",           locative: "Podlasiu",            genitive: "Podlasia",             capitalCity: "Białystok", capitalCityGenitive: "Białegostoku",    center: { lat: 53.1325, lng: 23.1688 }, emoji: "🦬", bg: "#E6EDDF" },
  { slug: "pomorskie",          label: "Pomorskie",          subtitle: "Trójmiasto i okolice",          locative: "Pomorskiem",          genitive: "Pomorskiego",          capitalCity: "Gdańsk", capitalCityGenitive: "Gdańska",         center: { lat: 54.3520, lng: 18.6466 }, emoji: "⚓", bg: "#F2EBDD" },
  { slug: "slaskie",            label: "Śląskie",            subtitle: "Katowice, GOP i okolice",       locative: "Śląskiem",            genitive: "Śląskiego",            capitalCity: "Katowice", capitalCityGenitive: "Katowic",         center: { lat: 50.2649, lng: 19.0238 }, emoji: "⛏️", bg: "#E8F0E4" },
  { slug: "swietokrzyskie",     label: "Świętokrzyskie",     subtitle: "Kielce i okolice",              locative: "Świętokrzyskiem",     genitive: "Świętokrzyskiego",     capitalCity: "Kielce", capitalCityGenitive: "Kielc",           center: { lat: 50.8661, lng: 20.6286 }, emoji: "🌲", bg: "#DFF0EC" },
  { slug: "warminsko-mazurskie",label: "Warmińsko-Mazurskie", subtitle: "Olsztyn, Mazury",              locative: "Warmińsko-Mazurskiem", genitive: "Warmińsko-Mazurskiego", capitalCity: "Olsztyn", capitalCityGenitive: "Olsztyna",        center: { lat: 53.7784, lng: 20.4801 }, emoji: "🛶", bg: "#E4EEF5" },
  { slug: "wielkopolskie",      label: "Wielkopolskie",      subtitle: "Poznań i okolice",              locative: "Wielkopolsce",        genitive: "Wielkopolski",         capitalCity: "Poznań", capitalCityGenitive: "Poznania",        center: { lat: 52.4064, lng: 16.9252 }, emoji: "🐐", bg: "#E6EDDF" },
  { slug: "zachodniopomorskie", label: "Zachodniopomorskie", subtitle: "Szczecin i okolice",            locative: "Zachodniopomorskiem", genitive: "Zachodniopomorskiego", capitalCity: "Szczecin", capitalCityGenitive: "Szczecina",       center: { lat: 53.4285, lng: 14.5528 }, emoji: "🌊", bg: "#E4EEF5" },
];

export const REGION_SLUGS: string[] = REGIONS.map((r) => r.slug);

export const REGION_BY_SLUG: Record<string, Region> = REGIONS.reduce(
  (acc, r) => ({ ...acc, [r.slug]: r }),
  {} as Record<string, Region>,
);

/**
 * Stare slugi miast → nowe slugi województw. Używane do 301-podobnego
 * przekierowania w routingu (`/atrakcje/warszawa` → `/atrakcje/mazowieckie`).
 */
export const LEGACY_CITY_TO_REGION: Record<string, string> = {
  warszawa: "mazowieckie",
  krakow: "malopolskie",
  wroclaw: "dolnoslaskie",
  trojmiasto: "pomorskie",
  poznan: "wielkopolskie",
  slask: "slaskie",
  lodz: "lodzkie",
};