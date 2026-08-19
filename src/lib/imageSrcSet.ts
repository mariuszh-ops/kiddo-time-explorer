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

/** Rozmiary dla kafla w karuzeli (~211 px na telefonie). */
export const CAROUSEL_SIZES = "(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px";
/** Rozmiary dla kafla w siatce listingu. */
export const GRID_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";
