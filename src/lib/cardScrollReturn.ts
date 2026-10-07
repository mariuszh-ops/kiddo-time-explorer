/**
 * GL-4-057/058: przewiniecie karty atrakcji trzymane W WPISIE HISTORII
 * (history.state), ten sam wzorzec co FMN-B03 dla listy (lib/homeListReturn.ts).
 *
 * "Podobne" -> inna karta -> "wstecz" montuje karte od nowa (inny pathname = inny
 * klucz <Routes>), a `history.scrollRestoration = "manual"` (main.tsx), wiec
 * przegladarka nie przywraca pozycji i karta startowala od gory (zmierzone
 * 07.10: scrollY 0 zamiast 3373 / 3808).
 *
 * Zapis idzie przy wyjsciu z karty linkiem, zanim router dopisze nowy wpis;
 * odczyt tylko dla wpisu o tym samym kluczu (react-router `location.key`).
 */

const POLE = "ffKartaY";

type StanWpisu = Record<string, unknown> | null;

function stanWpisu(): StanWpisu {
  try {
    const s = window.history.state as unknown;
    return s && typeof s === "object" ? (s as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Klucz wpisu tak, jak liczy go react-router: pierwszy wpis dokumentu nie ma `key`. */
function kluczWpisu(s: StanWpisu): string {
  return typeof s?.key === "string" ? s.key : "default";
}

/** Zapisane przewiniecie karty dla wpisu `klucz`; `null`, gdy brak albo to cudzy wpis. */
export function czytajPrzewiniecieKarty(klucz: string): number | null {
  const s = stanWpisu();
  if (kluczWpisu(s) !== klucz) return null;
  const y = s?.[POLE];
  return typeof y === "number" && Number.isFinite(y) && y > 0 ? Math.round(y) : null;
}

/**
 * Zapisuje przewiniecie w BIEZACYM wpisie historii — tylko jesli to wpis `klucz`
 * (karta w animacji wyjscia nie pisze do wpisu nastepnej strony).
 */
export function zapiszPrzewiniecieKarty(klucz: string, y: number): void {
  try {
    const s = stanWpisu();
    if (kluczWpisu(s) !== klucz) return;
    const nowy = Math.max(0, Math.round(y));
    if (s?.[POLE] === nowy) return;
    window.history.replaceState({ ...(s ?? {}), [POLE]: nowy }, "");
  } catch {
    // Przegladarka odmowila zapisu stanu — tracimy tylko przywracanie po "wstecz".
  }
}
