import { useCallback, useEffect, useRef } from "react";

/**
 * GOLIVE GL-4-004/005: systemowe „wstecz" przy otwartym oknie pełnoekranowym
 * (galeria zdjęć) ZAMYKA okno i zostawia użytkownika na stronie. Ten sam
 * mechanizm co F-16 (AuthRequiredModal) i FMN-B05 (useFilterSheetHistory),
 * bez zapisów filtrów w trakcie — okno nie zmienia adresu.
 *
 * Przy otwarciu kładziemy na wierzch historii wpis-atrapę (ten sam adres,
 * znacznik w `history.state`). „Wstecz" zdejmuje atrapę — adres się nie
 * zmienia, a listener `popstate` zamyka okno. Zamknięcie inną drogą (X, Esc,
 * klik w tło) zdejmuje atrapę samo.
 *
 * Znacznikiem jest token OTWARCIA, nie `true` (lekcja z FMN-B05): atrapa po
 * wcześniejszym otwarciu potrafi zostać w historii pod spodem, a znacznik
 * `true` udawałby wtedy „wciąż stoimy na atrapie".
 */
const CLOSE_ON_BACK_KEY = "closeOnBackOpen";

type StanHistorii = Record<string, unknown> | null;

const stanHistorii = () => window.history.state as StanHistorii;

const nowyToken = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function useCloseOnBack(isOpen: boolean, onClose: () => void) {
  // Token bieżącego otwarcia; null = okno nie ma wpisu w historii.
  const tokenRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  /**
   * Zdejmuje atrapę, jeśli wciąż na niej stoimy. Token czyścimy PRZED
   * `history.back()` — popstate z naszego własnego cofnięcia trafia wtedy na
   * `tokenRef === null` i nic nie robi.
   */
  const zdejmijAtrape = useCallback(() => {
    const token = tokenRef.current;
    if (token === null) return;
    tokenRef.current = null;
    // Ktoś już przenawigował — atrapy nie ma na wierzchu, cofnięcie zabrałoby
    // użytkownika o stronę za daleko.
    if (stanHistorii()?.[CLOSE_ON_BACK_KEY] !== token) return;
    try {
      window.history.back();
    } catch {
      /* brak History API */
    }
  }, []);

  useEffect(() => {
    if (!isOpen || tokenRef.current !== null) return;
    const token = nowyToken();
    try {
      // Stan react-routera (`idx`, `key`, `usr`) przepisujemy, jak w F-16.
      window.history.pushState(
        { ...stanHistorii(), [CLOSE_ON_BACK_KEY]: token },
        "",
        window.location.href,
      );
      tokenRef.current = token;
    } catch {
      /* brak History API — okno działa dalej, tylko bez wpisu w historii */
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) zdejmijAtrape();
  }, [isOpen, zdejmijAtrape]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const token = tokenRef.current;
      if (token === null) return;
      if ((event.state as StanHistorii)?.[CLOSE_ON_BACK_KEY] === token) return;
      tokenRef.current = null;
      onCloseRef.current();
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // Lista zależności MUSI być pusta — patrz GRABIE (F-16) w AuthRequiredModal:
    // listener przepinany w trakcie dispatchu `popstate` nie dostaje zdarzenia.
  }, []);

  useEffect(() => zdejmijAtrape, [zdejmijAtrape]);
}
