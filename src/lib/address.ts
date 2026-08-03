// Pomocniki adresowe: część atrakcji w katalogu ma puste `city` albo adres
// złożony z ogonków ("Gmina", "Powiat", wiszące przecinki). Tu to czyścimy.
import { REGION_BY_SLUG } from "@/data/regions";

/** Etykieta zastępcza dla pustego miasta: „woj. podkarpackie”. */
export function regionFallbackLabel(regionSlug?: string | null): string {
  if (!regionSlug) return "";
  const label = REGION_BY_SLUG[regionSlug]?.label;
  return label ? `woj. ${label.toLowerCase()}` : "";
}

/** Miejscowość na kaflu — miasto, a gdy puste: nazwa województwa. */
export function displayLocation(
  city?: string | null,
  regionSlug?: string | null,
): string {
  const c = city?.trim();
  if (c) return c;
  return regionFallbackLabel(regionSlug);
}

// Fragmenty, które same w sobie nic nie znaczą (sieroty po parsowaniu adresu).
const ORPHAN_PARTS = new Set([
  "gmina",
  "gm",
  "gm.",
  "powiat",
  "pow",
  "pow.",
  "województwo",
  "woj",
  "woj.",
  "ul",
  "ul.",
  "brak",
  "-",
  "—",
]);

/**
 * Adres składany tylko z sensownych fragmentów: bez pustych elementów,
 * wiszących przecinków i pojedynczych sierot typu „Gmina”.
 * Zwraca undefined, gdy nic nie zostaje.
 */
export function formatAddress(
  raw?: string | null,
  fallbackLocality?: string | null,
): string | undefined {
  const parts = (raw ?? "")
    .split(",")
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0)
    .filter((p) => !ORPHAN_PARTS.has(p.toLowerCase()));

  const seen = new Set<string>();
  const unique = parts.filter((p) => {
    const k = p.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (unique.length === 0) {
    const fb = fallbackLocality?.trim();
    return fb ? fb : undefined;
  }
  return unique.join(", ");
}
