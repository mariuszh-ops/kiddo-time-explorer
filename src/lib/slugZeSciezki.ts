/**
 * FMN-B83: slug wpisany ręcznie w adres (wielka litera, polskie znaki) → postać
 * kanoniczna, jak slugi w danych: małe litery ASCII.
 *
 *   „Śląskie” → „slaskie”, „ZOO” → „zoo”, „Łódzkie” → „lodzkie”.
 *
 * `ł` zamieniamy ręcznie, bo NFKD nie rozkłada liter z kreską (tak samo robi
 * slugify w pipeline). Ostatnie `toLowerCase` łapie znaki, które dopiero po NFKD
 * stają się wielkimi literami, więc wynik jest punktem stałym: złożenie złożonego
 * slugu nic nie zmienia i przekierowanie nie może się zapętlić.
 *
 * Funkcja nie wycina innych znaków: nieznany slug po złożeniu zostaje nieznany
 * i dalej kończy się stroną 404.
 */
export function zlozSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/ł/g, "l")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Ścieżka kanoniczna dla `/:region` i `/:region/:kategoria` albo `null`, gdy
 * ścieżka już jest kanoniczna albo region po złożeniu nadal jest nieznany
 * (wtedy zostaje 404, bez przekierowania).
 */
export function kanonicznaSciezkaRegionu(
  regionSlug: string | undefined,
  categorySlug: string | undefined,
  znanyRegion: (slug: string) => boolean,
): string | null {
  if (!regionSlug) return null;
  const region = zlozSlug(regionSlug);
  const kategoria = categorySlug ? zlozSlug(categorySlug) : undefined;
  if (region === regionSlug && kategoria === categorySlug) return null;
  if (!znanyRegion(region)) return null;
  return kategoria ? `/${region}/${kategoria}` : `/${region}`;
}

/**
 * Slug kategorii z `/kategoria/:categorySlug` po złożeniu albo `null`, gdy nie
 * ma czego poprawiać (slug już kanoniczny) albo złożony slug też jest nieznany.
 */
export function kanonicznySlugKategorii(
  categorySlug: string | undefined,
  znanaKategoria: (slug: string) => boolean,
): string | null {
  if (!categorySlug) return null;
  const kategoria = zlozSlug(categorySlug);
  if (kategoria === categorySlug) return null;
  return znanaKategoria(kategoria) ? kategoria : null;
}
