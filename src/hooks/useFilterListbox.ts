import { useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Wspólna logika dostępnego listboxa dla chipów filtrów na home
 * (Województwo / Wiek dziecka / Kategoria).
 *
 * Zapewnia: aria-haspopup/expanded/controls na chipie, obsługę klawiatury
 * (ArrowDown/ArrowUp/Home/End/Enter/Spacja/Escape), przeniesienie focusu do
 * panelu po otwarciu i powrót focusu na chip po zamknięciu.
 */
export function useFilterListbox(optionCount: number, initialActiveIndex = 0) {
  const reactId = useId();
  const listboxId = `filter-listbox-${reactId.replace(/[:]/g, "")}`;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLElement | null)[]>([]);
  const restoreFocusRef = useRef(false);

  const setOptionRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      optionRefs.current[index] = el;
    },
    []
  );

  const open = useCallback((index?: number) => {
    setActiveIndex(typeof index === "number" && index >= 0 ? index : initialActiveIndex);
    setIsOpen(true);
  }, [initialActiveIndex]);

  const close = useCallback((restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus;
    setIsOpen(false);
  }, []);

  // Focus: po otwarciu → wybrana/pierwsza opcja; po zamknięciu → chip.
  useEffect(() => {
    if (isOpen) {
      const target = optionRefs.current[activeIndex] ?? optionRefs.current.find(Boolean) ?? listRef.current;
      target?.focus?.();
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      buttonRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Utrzymuj focus na aktywnej opcji podczas nawigacji strzałkami.
  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[activeIndex]?.focus?.();
  }, [activeIndex, isOpen]);

  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        open(e.key === "ArrowUp" ? Math.max(optionCount - 1, 0) : undefined);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    },
    [close, isOpen, open, optionCount]
  );

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (e.key === "Tab") {
        // Panel jest portalowany — po Tab zamykamy i wracamy do naturalnej kolejności.
        close();
        return;
      }
      if (optionCount === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % optionCount);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + optionCount) % optionCount);
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(optionCount - 1);
      }
    },
    [close, optionCount]
  );

  const triggerAria = {
    "aria-haspopup": "listbox" as const,
    "aria-expanded": isOpen,
    "aria-controls": listboxId,
  };

  return {
    listboxId,
    isOpen,
    setIsOpen,
    open,
    close,
    activeIndex,
    setActiveIndex,
    buttonRef,
    listRef,
    setOptionRef,
    handleTriggerKeyDown,
    handleListKeyDown,
    triggerAria,
  };
}
