/**
 * Globalna obsługa uszkodzonej / wygasłej sesji (S-127).
 *
 * Klient katalogu wykrywa 401 / PGRST301 i woła `reportInvalidSession()`.
 * Komponent `SessionExpiredHandler` nasłuchuje i pokazuje jednorazowy
 * komunikat z możliwością ponownego logowania.
 *
 * X-H-01: powód bywa DWOJAKI i użytkownik może naprawić tylko jeden z nich.
 * "token" to zwykłe wygaśnięcie — jedyne wyjście to zalogować się ponownie.
 * "zegar" to rozjechany zegar urządzenia: `exp` tokenu porównuje się z czasem
 * KLIENTA, więc gdy urządzenie wyprzedza serwer o więcej niż TTL tokenu,
 * każdy świeżo wydany token rodzi się "przeterminowany" i odświeżanie kręci
 * się w kółko. Ponowne logowanie tego NIE naprawi — trzeba ustawić zegar.
 */

/** Dlaczego sesja przestała działać — decyduje o treści komunikatu. */
export type InvalidSessionReason = "token" | "zegar";

type Listener = (reason: InvalidSessionReason) => void;

const listeners = new Set<Listener>();
let alreadyReported = false;

export function onInvalidSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Zgłoś nieważny token — tylko raz na jeden pokazany komunikat. */
export function reportInvalidSession(reason: InvalidSessionReason = "token"): void {
  if (alreadyReported) return;
  alreadyReported = true;
  listeners.forEach((l) => {
    try {
      l(reason);
    } catch {
      // silent
    }
  });
}

/**
 * W-G-04: `alreadyReported` nie bylo NIGDY zerowane, wiec flaga znaczyla
 * „kiedykolwiek w zyciu tej karty", a nie „komunikat wisi na ekranie".
 * Skutek: drugie zerwanie sesji w tej samej karcie konczylo sie cisza —
 * zapytania leciały w 401, a uzytkownik nie dostawal zadnego sygnalu.
 * Flaga ma dalej scinac SERIE rownoleglych 401 do jednego komunikatu,
 * dlatego zerujemy ja dopiero, gdy komunikat zniknie z ekranu albo gdy
 * zacznie sie nowa sesja (`SIGNED_IN` / `TOKEN_REFRESHED`).
 */
export function clearInvalidSessionFlag(): void {
  alreadyReported = false;
}

/* ------------------------------------------------------------------ *
 * GL-1-005: odrzucone odswiezenie tokenu = ciche wylogowanie.
 *
 * Gdy GoTrue odrzuci refresh token (4xx, np. 400/401
 * `refresh_token_not_found` po zmianie hasla na innym urzadzeniu), auth-js
 * sam kasuje sesje i emituje `SIGNED_OUT`. Klient katalogu zglaszal martwa
 * sesje tylko przy 401 z REST, wiec uzytkownik tracil logowanie bez slowa.
 *
 * Samo `SIGNED_OUT` nie wystarczy: to samo zdarzenie przychodzi przy zwyklym
 * „Wyloguj sie”, po usunieciu konta i z innej karty (BroadcastChannel). Dlatego
 * `catalogFetch` notuje chwile odrzucenia odswiezenia, a komunikat pokazujemy
 * tylko wtedy, gdy `SIGNED_OUT` przyszlo tuz po nim. 5xx i bledy sieci auth-js
 * traktuje jako przejsciowe i sesji nie rusza — tych nie notujemy.
 * ------------------------------------------------------------------ */

/** auth-js kasuje sesje w tym samym wywolaniu co odpowiedz — milisekundy. */
const OKNO_WYLOGOWANIA_PO_ODRZUCENIU_MS = 5_000;

const terazMonotonicznie = (): number =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

let odrzucenieOdswiezeniaO: number | null = null;

/** Zanotuj odpowiedz serwera na odswiezenie tokenu (woła `catalogFetch`). */
export function noteRefreshResponse(status: number, teraz: number = terazMonotonicznie()): void {
  odrzucenieOdswiezeniaO = status >= 400 && status < 500 ? teraz : null;
}

/**
 * Czy wlasnie zakonczone `SIGNED_OUT` jest skutkiem odrzuconego odswiezenia?
 * Zuzywa znacznik — kolejne `SIGNED_OUT` (np. nasze wlasne `signOut` lokalne)
 * juz go nie zobacza.
 */
export function takeRefreshRejection(teraz: number = terazMonotonicznie()): boolean {
  const t = odrzucenieOdswiezeniaO;
  odrzucenieOdswiezeniaO = null;
  return t !== null && teraz - t >= 0 && teraz - t < OKNO_WYLOGOWANIA_PO_ODRZUCENIU_MS;
}
