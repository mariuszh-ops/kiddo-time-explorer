/**
 * FMN-B03: stan listy strony glownej trzymany W WPISIE HISTORII (history.state),
 * nie w adresie — adres zostaje czysty do udostepniania, a "wstecz" z karty
 * atrakcji odtwarza liczbe doladowanych porcji i przewiniecie.
 *
 * Dlaczego nie w stanie Reacta: Index odmontowuje sie przy wejsciu na karte
 * (inny pathname = inny klucz <Routes>), wiec numer strony z useState ginal
 * i po powrocie lista startowala od 24 kafli (zmierzone 24.09: 48 -> 24,
 * przewiniecie 3127 -> 473 px).
 *
 * Dlaczego history.state, a nie sessionStorage po `location.key`: pierwszy wpis
 * dokumentu ma zawsze klucz "default", wiec wpisanie adresu z palca w tej samej
 * karcie trafialoby na cudzy zapis. Stan wpisu historii rodzi sie pusty przy
 * kazdym nowym wpisie, a przezywa "wstecz", "naprzod" i F5.
 *
 * Piszemy wprost przez history.replaceState, z zachowaniem pol react-routera
 * ({ usr, key, idx }): router nie slucha replaceState, wiec zapis nie wywoluje
 * nawigacji, renderu ani nie zmienia `location.key`.
 */

const POLE = "ffLista";

export interface ZapisListy {
  /** Ile porcji po HOME_PAGE_SIZE bylo zaladowanych (1 = tylko pierwsza). */
  strony: number;
  /** window.scrollY w chwili wyjscia z listy linkiem (brak = nie wychodzilismy). */
  y?: number;
}

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

function poprawny(z: unknown): ZapisListy | null {
  if (!z || typeof z !== "object") return null;
  const { strony, y } = z as Record<string, unknown>;
  if (typeof strony !== "number" || !Number.isFinite(strony) || strony < 1) return null;
  const wynik: ZapisListy = { strony: Math.floor(strony) };
  if (typeof y === "number" && Number.isFinite(y) && y >= 0) wynik.y = Math.round(y);
  return wynik;
}

/**
 * Zapis listy dla wpisu `klucz`. `null`, gdy biezacy wpis historii nie jest tym
 * wpisem (np. komponent w animacji wyjscia) albo nic nie zapisano.
 */
export function czytajZapisListy(klucz: string): ZapisListy | null {
  const s = stanWpisu();
  if (kluczWpisu(s) !== klucz) return null;
  return poprawny(s?.[POLE]);
}

/**
 * Dopisuje zmiane do zapisu listy w BIEZACYM wpisie historii — tylko jesli to
 * wpis `klucz`. Po nawigacji biezacym wpisem jest juz cudzy (karta atrakcji),
 * a animacja wyjscia wciaz trzyma stary Index; zapis trafilby wtedy nie tam.
 */
export function zapiszListe(klucz: string, zmiana: Partial<ZapisListy>): void {
  try {
    const s = stanWpisu();
    if (kluczWpisu(s) !== klucz) return;
    const stary = poprawny(s?.[POLE]);
    const nowy: ZapisListy = { strony: stary?.strony ?? 1, ...stary, ...zmiana };
    // Kazdy replaceState to wpis w historii zapisow adresu (I2) — nie piszemy
    // tego, co juz jest, ani samego stanu domyslnego.
    if (stary ? stary.strony === nowy.strony && stary.y === nowy.y : nowy.strony === 1 && nowy.y === undefined) {
      return;
    }
    window.history.replaceState({ ...(s ?? {}), [POLE]: nowy }, "");
  } catch {
    // Przegladarka odmowila zapisu stanu (limit rozmiaru, tryb osadzony) —
    // tracimy tylko przywracanie po "wstecz", lista dziala dalej.
  }
}
