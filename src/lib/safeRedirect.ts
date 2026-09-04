/**
 * Schematy, ktore przegladarka potrafi wykonac jako kod albo jako lokalny
 * zasob. Adres przekierowania OAuth trafia prosto do `window.location.href`,
 * wiec `javascript:` zamienilby przekierowanie w XSS na naszym originie.
 */
const ZABRONIONE_SCHEMATY = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "blob:",
  "file:",
  "about:",
]);

/**
 * Waliduje adres przekierowania zwrocony przez serwer autoryzacji.
 *
 * Celowo NIE ograniczamy sie do wlasnego originu ani do http(s): w OAuth 2.1
 * `redirect_uri` z definicji wskazuje na klienta, a klienci natywni (RFC 8252)
 * uzywaja prywatnych schematow w rodzaju `com.example.app:/cb`. Blokujemy
 * wylacznie to, co daje wykonanie kodu.
 *
 * Zwraca znormalizowany adres albo `null`, gdy adres jest nieparsowalny lub
 * uzywa zabronionego schematu.
 */
export function bezpieczneWyjscie(wartosc: unknown): string | null {
  if (typeof wartosc !== "string" || wartosc.trim() === "") return null;
  let url: URL;
  try {
    url = new URL(wartosc, window.location.origin);
  } catch {
    return null;
  }
  if (ZABRONIONE_SCHEMATY.has(url.protocol.toLowerCase())) return null;
  return url.href;
}
