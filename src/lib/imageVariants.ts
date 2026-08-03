// W R2 obok oryginału (…/{place_id}/0.webp, ~1200 px) leżą mniejsze warianty
// z sufiksem -320/-480/-640. Hero na telefonie ma brać -480, nie oryginał.
const R2_ORIGINAL_RE = /\/0\.webp$/i;

/** srcset dla hero: wariant 480 px na mobile, oryginał na desktopie. */
export function buildHeroSrcSet(src?: string | null): string | undefined {
  if (!src || !R2_ORIGINAL_RE.test(src)) return undefined;
  const base = src.replace(R2_ORIGINAL_RE, "/0");
  return `${base}-480.webp 480w, ${src} 1200w`;
}

/** sizes dopasowane do hero (pełna szerokość na mobile, kontener na desktopie). */
export const HERO_SIZES = "(max-width: 767px) 100vw, 1200px";
