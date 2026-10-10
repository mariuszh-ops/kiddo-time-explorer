/**
 * FMN-B54 (R2 = A, decyzja właściciela 08.10): karta atrakcji pamięta listę,
 * z której rodzic na nią wszedł.
 *
 * Adres karty (/atrakcje/<slug>) nie niesie filtrów listy, więc okruszki i
 * wyszukiwarka w nagłówku karty prowadziły na gołe strony: ginął wiek,
 * kategoria i sort (zmierzone 26.09, 6/6 przejść z karty, tabela FMN-5).
 *
 * Kafel listy przekazuje adres listy w stanie linku (`state` -> history.state.usr):
 * stan przeżywa F5 i „wstecz” w tej samej karcie przeglądarki i nie przecieka
 * do innych kart (FMN-5 C5–C7 pilnują, dlatego NIE localStorage). Karta otwarta
 * z linku, z Google albo ctrl+klikiem nie ma stanu i zostaje przy okruszkach
 * bez parametrów. Logo zostaje resetem (R2).
 *
 * Z listy bierzemy tylko to, co R2 każe przenieść: województwo, kategorię, wiek
 * i sort — zwalidowane jak na stronach docelowych i przetłumaczone na ich słownik
 * (wspólne helpery z FMN-B52, regionExitLinks.ts).
 */
import { REGION_SLUGS } from "@/data/regions";
import { CATEGORY_ORDER } from "@/data/categoryLabels";
import { filterOptions } from "@/data/activities";
import { SORT_NA_GLOWNA, zParametrami, type RegionPageSort } from "@/lib/regionExitLinks";

const POLE = "ffZListy";

/** Filtry listy źródłowej w słowniku strony regionu (sort: rating | reviews | name). */
export interface FiltryListy {
  region?: string;
  /** Kategorie listy; na „/” może ich być kilka (`?type=zoo,park`). */
  typy?: string[];
  wiek?: string;
  sort?: RegionPageSort;
}

/** Sort z „/” (rating | most_reviewed | name, przyjmuje też reviews) i ze strony regionu. */
const SORT_Z_LISTY = new Map<string, RegionPageSort>([
  ["rating", "rating"],
  ["most_reviewed", "reviews"],
  ["reviews", "reviews"],
  ["name", "name"],
]);

const jestRegionem = (s: string | undefined): s is string =>
  Boolean(s) && (REGION_SLUGS as readonly string[]).includes(s as string);
const jestKategoria = (s: string | undefined): s is string =>
  Boolean(s) && (CATEGORY_ORDER as readonly string[]).includes(s as string);

/**
 * Filtry listy z jej adresu. `null`, gdy adres nie jest listą („/”, /<woj>,
 * /<woj>/<kat>, /atrakcje/<woj>[/<kat>], /kategoria/<kat>) albo nie ma na nim
 * nic do przeniesienia.
 */
export function filtryZAdresuListy(pathname: string, search: string): FiltryListy | null {
  const seg = pathname.split("/").filter(Boolean);
  const q = new URLSearchParams(search);
  let region: string | undefined;
  let kategoriaWSciezce: string | undefined;
  let typyZQuery: string[] = [];
  if (seg.length === 0) {
    const r = q.get("region")?.trim().toLowerCase();
    if (jestRegionem(r)) region = r;
    typyZQuery = [
      ...new Set((q.get("type") ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(jestKategoria)),
    ];
  } else {
    if (seg.length <= 2 && jestRegionem(seg[0])) {
      region = seg[0];
      kategoriaWSciezce = seg[1];
    } else if (seg[0] === "atrakcje" && seg.length <= 3 && jestRegionem(seg[1])) {
      region = seg[1];
      kategoriaWSciezce = seg[2];
    } else if (seg[0] === "kategoria" && seg.length === 2) {
      kategoriaWSciezce = seg[1];
    } else {
      return null;
    }
    // Strona regionu zna jedną kategorię z ?type=, i tylko bez kategorii w ścieżce.
    const t = q.get("type") ?? undefined;
    if (!kategoriaWSciezce && jestKategoria(t)) typyZQuery = [t];
  }
  const typy = jestKategoria(kategoriaWSciezce) ? [kategoriaWSciezce] : typyZQuery;
  const wiek = q.get("age")?.trim().replace(/[–—]/g, "-");
  // Map, nie obiekt: ?sort=constructor nie może trafić w pole prototypu.
  const sort = SORT_Z_LISTY.get(q.get("sort") ?? "");
  const f: FiltryListy = {};
  if (region) f.region = region;
  if (typy.length > 0) f.typy = typy;
  if (wiek && filterOptions.age.some((o) => o.value === wiek)) f.wiek = wiek;
  if (sort) f.sort = sort;
  return Object.keys(f).length > 0 ? f : null;
}

/** `state` linku kafla: adres listy, gdy jest z czego brać filtry; inaczej brak stanu (jak dotąd). */
export function stanLinkuKarty(pathname: string, search: string): Record<string, string> | undefined {
  return filtryZAdresuListy(pathname, search) ? { [POLE]: `${pathname}${search}` } : undefined;
}

/** Filtry listy ze stanu wpisu karty (`location.state`). Obcy albo uszkodzony stan = `null`. */
export function filtryZeStanuKarty(stan: unknown): FiltryListy | null {
  if (!stan || typeof stan !== "object") return null;
  const adres = (stan as Record<string, unknown>)[POLE];
  if (typeof adres !== "string" || !adres.startsWith("/")) return null;
  const i = adres.indexOf("?");
  return i < 0 ? filtryZAdresuListy(adres, "") : filtryZAdresuListy(adres.slice(0, i), adres.slice(i));
}

/** „/” w słowniku strony głównej: region, wiek, kategorie (po przecinku), sort. */
function adresGlownej(f: FiltryListy, pary: Array<[string, string | undefined]> = []): string {
  return zParametrami("/", [
    ["region", f.region],
    ["age", f.wiek],
    ...pary,
  ]);
}

export interface OkruszkiKarty {
  glowna: string;
  wojewodztwo: string;
  kategoria: string;
}

/**
 * Adresy okruszków karty. `wojewodztwo` i `kategoria` to dzisiejsze ścieżki
 * (/<woj>, /<woj>/<kat> albo /kategoria/<typ>), do których doklejamy filtry
 * listy w słowniku strony regionu. Bez listy (`null`) — ścieżki bez zmian.
 */
export function okruszkiKarty(
  f: FiltryListy | null,
  sciezki: { wojewodztwo: string; kategoria: string },
): OkruszkiKarty {
  if (!f) return { glowna: "/", ...sciezki };
  // Strona regionu zna jedną kategorię: przy kilku z „/” okruszek województwa
  // pokazuje wszystkie kategorie (szerzej), zamiast wybierać jedną za rodzica.
  const jednaKategoria = f.typy?.length === 1 ? f.typy[0] : undefined;
  return {
    glowna: adresGlownej(f, [
      ["type", f.typy?.join(",")],
      ["sort", f.sort ? SORT_NA_GLOWNA[f.sort] : undefined],
    ]),
    wojewodztwo: zParametrami(sciezki.wojewodztwo, [
      ["age", f.wiek],
      ["type", jednaKategoria],
      ["sort", f.sort],
    ]),
    kategoria: zParametrami(sciezki.kategoria, [
      ["age", f.wiek],
      ["sort", f.sort],
    ]),
  };
}

/** Wyszukiwarka w nagłówku karty: „/” z frazą, wiekiem i województwem listy (jeśli je miała). */
export function adresSzukaniaZKarty(fraza: string, f: FiltryListy | null): string {
  if (!f) return `/?search=${encodeURIComponent(fraza)}`;
  return adresGlownej(f, [["search", fraza]]);
}
