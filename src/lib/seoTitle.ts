/**
 * Długość <title>. Google pokazuje ok. 60–65 znaków, resztę ucina wielokropkiem.
 * Audyt 400 (BC-E-02) znalazł 56 ze 119 stron powyżej 65 znaków, a przy
 * 120-znakowej nazwie atrakcji <title> miał 163 znaki (BA-H-07).
 */
export const TITLE_MAX = 65;

const BRAND = "FamilyFun";
const SUFFIX = ` | ${BRAND}`;
/** „ — strona 3” na paginacji: to musi przeżyć skracanie, inaczej tytuły się dublują. */
const PAGE_TAIL = /\s+—\s+strona\s+\d+$/;

const trimTail = (s: string) => s.replace(/[\s,.;:—–-]+$/, "");

/** Czy tytuł (razem z „ | FamilyFun”) zmieści się w limicie. */
export function fitsSeoTitle(title: string, max = TITLE_MAX): boolean {
  return (title.includes(BRAND) ? title : `${title}${SUFFIX}`).length <= max;
}

/**
 * Doklej markę i przytnij do `max` znaków na granicy słowa.
 * Marka i numer strony zostają — ucinany jest początek tytułu.
 */
export function buildSeoTitle(title: string, max = TITLE_MAX): string {
  const full = title.includes(BRAND) ? title : `${title}${SUFFIX}`;
  if (full.length <= max) return full;

  const idx = full.lastIndexOf(SUFFIX);
  const head = idx === -1 ? full : full.slice(0, idx);
  const brand = idx === -1 ? "" : full.slice(idx);
  const tail = head.match(PAGE_TAIL)?.[0] ?? "";
  const body = tail ? head.slice(0, head.length - tail.length) : head;

  const budget = max - brand.length - tail.length - 1; // 1 znak na „…”
  if (budget <= 0) return full.slice(0, max);

  let cut = body.slice(0, budget);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > budget / 2) cut = cut.slice(0, lastSpace);
  return `${trimTail(cut)}…${tail}${brand}`;
}

/**
 * <title> karty atrakcji: „{nazwa} — {region} | FamilyFun”.
 * Skracana jest WYŁĄCZNIE nazwa — region i marka muszą zostać, bo po nich
 * czytelnik poznaje wynik w Google.
 */
export function buildActivityTitle(name: string, regionLabel: string, max = TITLE_MAX): string {
  const suffix = `${regionLabel ? ` — ${regionLabel}` : ""}${SUFFIX}`;
  const budget = max - suffix.length - 1; // 1 znak na „…”
  if (name.length + suffix.length <= max) return `${name}${suffix}`;
  if (budget <= 0) return `${name.slice(0, Math.max(1, max - SUFFIX.length))}${SUFFIX}`;

  let cut = name.slice(0, budget);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > budget / 2) cut = cut.slice(0, lastSpace);
  return `${trimTail(cut)}…${suffix}`;
}
