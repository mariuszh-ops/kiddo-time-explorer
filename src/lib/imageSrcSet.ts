/**
 * Wspólny mechanizm wariantów obrazów (ten sam, co karty atrakcji w siatce).
 *
 * Obsługiwane wzorce:
 *  - R2/CDN: …/{place_id}/0.webp  → 0-320 / 0-480 / 0-640 / oryginał (1200w)
 *  - lokalne obrazy bloga: /blog/nazwa.webp → nazwa-320 / nazwa-480 / oryginał
 *
 * `src` zostaje zawsze jako fallback, gdy wariant nie istnieje.
 */
const R2_ORIGINAL_RE = /\/0\.webp$/i;
const BLOG_RE = /^\/blog\/([^/]+)\.webp$/i;

export function buildSrcSet(src: string): string | undefined {
  if (!src) return undefined;
  if (R2_ORIGINAL_RE.test(src)) {
    const base = src.replace(R2_ORIGINAL_RE, "/0");
    return [
      `${base}-320.webp 320w`,
      `${base}-480.webp 480w`,
      `${base}-640.webp 640w`,
      `${src} 1200w`,
    ].join(", ");
  }
  const blog = src.match(BLOG_RE);
  if (blog) {
    const base = `/blog/${blog[1]}`;
    return [`${base}-320.webp 320w`, `${base}-480.webp 480w`, `${src} 1200w`].join(", ");
  }
  return undefined;
}

/**
 * Nie każda atrakcja ma w R2 warianty -320/-480/-640 (np. zdjęcia wgrane
 * później). Gdy przeglądarka wybierze taki wariant i dostanie 404, zdejmujemy
 * srcset — wtedy ponowi próbę z oryginałem z `src` zamiast pokazać dziurę.
 * Zwraca `true`, jeśli podjęto taką próbę (czyli NIE należy jeszcze uznawać
 * obrazu za zepsuty).
 */
export function fallbackToOriginal(img: HTMLImageElement): boolean {
  if (img.srcset && /-(320|480|640)\.webp$/i.test(img.currentSrc || "")) {
    img.srcset = "";
    img.sizes = "";
    return true;
  }
  return false;
}

/**
 * Srcset kafla (siatka i karuzela) — jak dymek pinu: BEZ kandydata 1200w.
 * Kafel ma na telefonie ~264 px przy oknie 360 px; z DPR 2–3 przegladarka
 * liczyla 528–882 px i siegala po ORYGINAL `0.webp` (309–385 kB), przez co
 * LCP listingow mobile wynosilo 8–9 s. Sufit `-640` wystarcza na kazdy z tych
 * ekranow (K-19 / N-02).
 */
export function buildTileSrcSet(src: string): string | undefined {
  const set = buildSrcSet(src);
  if (!set) return undefined;
  const bezOryginalu = set
    .split(", ")
    .filter((k) => !/\s1200w$/.test(k))
    .join(", ");
  return bezOryginalu || undefined;
}

/** Rozmiary dla kafla w karuzeli (~211 px na telefonie). */
export const CAROUSEL_SIZES = "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px";
/**
 * Rozmiary dla kafla w siatce listingu — zmierzone szerokosci renderowania:
 * 224/320, 264/360, 294/390, 316/412, 208/768, 278/1280, 308/1920 px.
 * Poprzednie `100vw` na telefonie zawyzalo zadanie o ~36 % (K-19).
 */
export const GRID_SIZES =
  "(max-width: 640px) calc(100vw - 96px), (max-width: 1024px) 30vw, (max-width: 1536px) 23vw, 320px";
