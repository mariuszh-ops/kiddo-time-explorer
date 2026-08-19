/**
 * Bezpieczna obsługa adresów URL podawanych przez użytkowników.
 * Dopuszczamy WYŁĄCZNIE protokoły http: i https:.
 */

/** Dopisuje https:// gdy brakuje protokołu (np. "www.przyklad.pl"). */
export function normalizeUrlInput(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(v)) return v;
  if (v.startsWith("//")) return `https:${v}`;
  return `https://${v}`;
}

/** true tylko dla poprawnego URL-a z protokołem http/https. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Zwraca adres nadający się do href albo null (wtedy renderuj jako tekst). */
export function safeHref(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = normalizeUrlInput(value);
  return isHttpUrl(normalized) ? normalized : null;
}