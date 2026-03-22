export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  category: string;
  city?: string;
  tags: string[];
  publishedAt: string;
  readTimeMinutes: number;
}

export const blogPosts: BlogPost[] = [
  {
    id: 1,
    slug: "top-10-placow-zabaw-warszawa",
    title: "Top 10 placów zabaw w Warszawie — ranking rodziców",
    excerpt: "Sprawdziliśmy dziesiątki placów zabaw w stolicy. Oto te, do których rodzice wracają najchętniej.",
    content: `# Top 10 placów zabaw w Warszawie

Warszawa oferuje dziesiątki placów zabaw, ale nie wszystkie są warte wizyty. Zapytaliśmy rodziców, które miejsca polecają najbardziej — oto wynik naszego rankingu.

## 1. Plac zabaw w Parku Praskim
Jeden z największych i najnowocześniejszych placów zabaw w Warszawie. Strefy podzielone wiekowo, bezpieczna nawierzchnia, dużo cienia latem.

## 2. Plac zabaw nad Wisłą (Bulwary)
Świetna lokalizacja tuż nad rzeką. Po zabawie można spacerować bulwarami lub zjeść lody w jednej z budek.

## 3. Plac zabaw w Parku Skaryszewskim
Duża przestrzeń, blisko stawów z kaczkami. Idealny na dłuższe wypady z piknikiem.

## Podsumowanie
Warszawa ma wiele świetnych placów zabaw — warto odwiedzić kilka i znaleźć ulubiony.`,
    imageUrl: "https://images.unsplash.com/photo-1566454825481-f8b1cc0a5765?w=800&auto=format&fit=crop",
    category: "Top lista",
    city: "warszawa",
    tags: ["Warszawa", "place zabaw", "na zewnątrz"],
    publishedAt: "2026-03-10",
    readTimeMinutes: 5,
  },
  {
    id: 2,
    slug: "co-robic-z-dzieckiem-w-deszczu-warszawa",
    title: "Pada deszcz? 8 pomysłów na wyjście z dzieckiem w Warszawie",
    excerpt: "Deszczowy weekend nie musi oznaczać siedzenia w domu. Oto sprawdzone atrakcje indoor dla rodzin.",
    content: `# Pada deszcz? 8 pomysłów na wyjście z dzieckiem

Deszczowy weekend w Warszawie nie musi oznaczać nudy w domu. Oto nasze sprawdzone propozycje na wyjścia z dziećmi, gdy pogoda nie sprzyja zabawom na zewnątrz.

## 1. Centrum Nauki Kopernik
Interaktywne wystawy, eksperymenty, planetarium — tu można spędzić cały dzień i nie zauważyć deszczu za oknem.

## 2. Sala zabaw Kraina Malucha
Dla młodszych dzieci (1-6 lat) — bezpieczna przestrzeń z miękkimi elementami, zjeżdżalniami i basenem z piłkami.

## 3. Park Trampolin
Wyładowanie energii gwarantowane. Większość parków trampolin oferuje strefy dla różnych grup wiekowych.

## Podsumowanie
Deszcz to nie wymówka — Warszawa ma mnóstwo atrakcji indoor, które ucieszą dzieci w każdym wieku.`,
    imageUrl: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop",
    category: "Przewodnik",
    city: "warszawa",
    tags: ["Warszawa", "indoor", "deszcz", "zima"],
    publishedAt: "2026-03-05",
    readTimeMinutes: 4,
  },
  {
    id: 3,
    slug: "jak-przygotowac-sie-do-wizyty-w-zoo",
    title: "Wizyta w Zoo z dzieckiem — poradnik praktyczny",
    excerpt: "Co zabrać, kiedy przyjść, na co uważać? Wszystko co musisz wiedzieć przed wyjściem do Zoo.",
    content: `# Wizyta w Zoo z dzieckiem — poradnik praktyczny

Zoo to jedna z najpopularniejszych atrakcji rodzinnych. Ale żeby wizyta była udana, warto się przygotować.

## Kiedy przyjść?
Najlepiej rano — zwierzęta są bardziej aktywne, a tłumy mniejsze. Unikaj weekendów w sezonie letnim.

## Co zabrać?
- Wygodne buty (dużo chodzenia!)
- Krem z filtrem i czapkę
- Wodę i przekąski
- Wózek dla młodszych dzieci

## Na co uważać?
- Nie karm zwierząt jedzeniem z zewnątrz
- Trzymaj dzieci za rękę przy wybiegach
- Zaplanuj przerwy — Zoo to maraton, nie sprint

## Podsumowanie
Z dobrym przygotowaniem wizyta w Zoo będzie wspaniałą przygodą dla całej rodziny.`,
    imageUrl: "https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=800&auto=format&fit=crop",
    category: "Porada",
    tags: ["zoo", "poradnik", "przygotowanie"],
    publishedAt: "2026-02-28",
    readTimeMinutes: 6,
  },
];
