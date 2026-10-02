import { useCallback, useEffect, useRef } from "react";

/**
 * FMN-B05 (R3): systemowe „wstecz" przy otwartym arkuszu filtrów ZAMYKA arkusz
 * i nie cofa strony — tak jak F-16 dla okna logowania (AuthRequiredModal).
 *
 * Mechanizm: przy otwarciu kładziemy na wierzch historii wpis-atrapę (ten sam
 * adres, znacznik w `history.state`). „Wstecz" zdejmuje atrapę — adres się nie
 * zmienia, a listener `popstate` zamyka arkusz. Zamknięcie inną drogą (X, Esc,
 * tło, „Pokaż wyniki") zdejmuje atrapę samo.
 *
 * Różnica względem F-16: w arkuszu zmienia się filtry, a każda zmiana to wpis
 * w historii (R1). Zwykły push położyłby wpis filtra NA atrapie, więc „wstecz"
 * cofałoby filtr zamiast zamknąć arkusz (dokładnie objaw B05). Dlatego zapis
 * filtra przy otwartym arkuszu idzie przez `zapiszWArkuszu`:
 *   1. filtr zapisuje się jako `replace` — atrapa staje się wpisem filtra,
 *   2. na wierzch trafia nowa atrapa z nowym adresem.
 * Historia po „wiek 3-5" w arkuszu: [/, /?age=3-5, /?age=3-5 + atrapa].
 * „Wstecz" zamyka arkusz i filtr zostaje; następne „wstecz" cofa filtr (R1).
 *
 * Znacznikiem jest token OTWARCIA, nie `true`. Wpis-atrapa potrafi zostać
 * w historii pod spodem (np. przejście do karty z podpowiedzi wyszukiwarki
 * w arkuszu), a po powrocie na niego znacznik `true` udawałby „wciąż stoimy na
 * atrapie" i „wstecz" nie zamknęłoby kolejnego arkusza.
 */
const SHEET_HISTORY_KEY = "filterSheetOpen";

/** Jak zapisać zmianę filtra w adresie. Bez opcji = push (R1). */
export type FilterWriteOptions = { replace?: boolean };

type StanHistorii = Record<string, unknown> | null;

const stanHistorii = () => window.history.state as StanHistorii;

const stoimyNaAtrapie = (token: string | null) =>
  token !== null && stanHistorii()?.[SHEET_HISTORY_KEY] === token;

const polozAtrape = (token: string) => {
  // Stan react-routera (`idx`, `key`, `usr`) przepisujemy, jak w F-16 — bez
  // `idx` kolejne navigate() przy otwartym arkuszu liczyłoby indeks jako NaN.
  window.history.pushState(
    { ...stanHistorii(), [SHEET_HISTORY_KEY]: token },
    "",
    window.location.href,
  );
};

const nowyToken = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * Atrapa, którą już zdejmuje któryś egzemplarz hooka (`history.back()` jest
 * asynchroniczne). Arkusz zamontowany na nowo, zanim cofnięcie dojdzie, nie
 * może cofnąć drugi raz — zabrałby użytkownika o wpis za daleko.
 */
let zdejmowanaAtrapa: string | null = null;

/**
 * FMN-B72: dokument załadowano NA wpisie-atrapie (F5 przy otwartym arkuszu albo
 * powrót z innej witryny). Znacznik w `history.state` przeżywa przeładowanie,
 * a nowy arkusz startuje zamknięty i z pustym tokenem, więc atrapy nikt nie
 * zdejmuje: pod nią leży wpis filtra z tym samym adresem i pierwsze „wstecz"
 * nic nie zmienia na ekranie (R1).
 *
 * Tylko wpis, na którym załadowano dokument (`name` = bieżący adres). Atrapa,
 * na którą wraca się z karty wewnątrz aplikacji, zostaje: podpowiedź
 * wyszukiwarki dopisuje na niej frazę (persistSearchInHistory), a wpis pod nią
 * frazy nie ma.
 */
const osieroconaAtrapaPoZaladowaniu = (): string | null => {
  const znacznik = stanHistorii()?.[SHEET_HISTORY_KEY];
  if (typeof znacznik !== "string" || znacznik === zdejmowanaAtrapa) return null;
  try {
    const nawigacja = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nawigacja?.type !== "reload" && nawigacja?.type !== "back_forward") return null;
    if (nawigacja.name !== window.location.href) return null;
  } catch {
    return null;
  }
  return znacznik;
};

export function useFilterSheetHistory(isOpen: boolean, onClose: () => void) {
  // Token bieżącego otwarcia; null = arkusz nie ma wpisu w historii.
  const tokenRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  /**
   * Zdejmuje atrapę, jeśli wciąż na niej stoimy. Token czyścimy PRZED
   * `history.back()` — popstate z naszego własnego cofnięcia trafia wtedy na
   * `tokenRef === null` i nic nie robi (ta sama zasada co w F-16, bez flagi
   * „połknij następne popstate", która potrafiła zjeść prawdziwe „wstecz").
   */
  const zdejmijAtrape = useCallback(() => {
    const token = tokenRef.current;
    if (token === null) return;
    tokenRef.current = null;
    // Ktoś już przenawigował (np. podpowiedź wyszukiwarki otworzyła kartę) —
    // atrapy nie ma na wierzchu, cofnięcie zabrałoby użytkownika za daleko.
    if (!stoimyNaAtrapie(token)) return;
    zdejmowanaAtrapa = token;
    try {
      window.history.back();
    } catch {
      /* brak History API */
    }
  }, []);

  // FMN-B72: osierocona atrapa po F5 — jedno „wstecz" na wpis filtra pod nią
  // (ten sam adres). Popstate z tego cofnięcia trafia na `tokenRef === null`
  // i niczego nie zamyka; router dostaje POP na ten sam adres, bez wpisu.
  useEffect(() => {
    if (isOpen) return;
    const znacznik = osieroconaAtrapaPoZaladowaniu();
    if (znacznik === null) return;
    zdejmowanaAtrapa = znacznik;
    try {
      window.history.back();
    } catch {
      /* brak History API */
    }
    // Tylko przy montażu: osierocona atrapa to wpis, na którym załadowano dokument.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isOpen || tokenRef.current !== null) return;
    const token = nowyToken();
    try {
      polozAtrape(token);
      tokenRef.current = token;
    } catch {
      /* brak History API — arkusz działa dalej, tylko bez wpisu w historii */
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) zdejmijAtrape();
  }, [isOpen, zdejmijAtrape]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const token = tokenRef.current;
      if (token === null) return;
      if ((event.state as StanHistorii)?.[SHEET_HISTORY_KEY] === token) return;
      tokenRef.current = null;
      onCloseRef.current();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // Lista zależności MUSI być pusta — patrz GRABIE (F-16) w AuthRequiredModal:
    // listener przepinany w trakcie dispatchu `popstate` nie dostaje zdarzenia.
  }, []);

  useEffect(() => zdejmijAtrape, [zdejmijAtrape]);

  /**
   * Zapis filtra z wnętrza arkusza. `zapisz` musi pisać adres SYNCHRONICZNIE
   * (BrowserRouter: navigate() od razu woła history.replaceState).
   */
  const zapiszWArkuszu = useCallback((zapisz: (opcje?: FilterWriteOptions) => void) => {
    const token = tokenRef.current;
    if (!stoimyNaAtrapie(token)) {
      zapisz();
      return;
    }
    zapisz({ replace: true });
    // react-router zapisuje własny stan (bez naszego znacznika), więc po
    // zapisie znacznika nie ma: atrapa stała się wpisem filtra — kładziemy
    // nową. Zapis bez zmiany adresu (filtr trzymany tylko w pamięci) znacznik
    // zostawia i wtedy nie kładziemy niczego.
    if (tokenRef.current === token && !stoimyNaAtrapie(token)) {
      try {
        polozAtrape(token as string);
      } catch {
        tokenRef.current = null;
      }
    }
  }, []);

  return { zapiszWArkuszu };
}
