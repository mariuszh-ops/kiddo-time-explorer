/**
 * Śledzi ostatni element z focusem POZA modalem, żeby po zamknięciu
 * (także klawiszem Esc) przywrócić focus na element, który modal otworzył.
 */
let lastFocusedOutside: HTMLElement | null = null;

if (typeof document !== "undefined") {
  document.addEventListener(
    "focusin",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function") return;
      // Pomijamy body i focus-guardy Radixa — to nie są realne openery.
      if (target === document.body || target === document.documentElement) return;
      if (target.hasAttribute("data-radix-focus-guard")) return;
      if (target.closest('[role="dialog"],[data-radix-popper-content-wrapper]')) return;
      lastFocusedOutside = target;
    },
    true,
  );
}

export const getReturnFocusTarget = () => lastFocusedOutside;

/** Przywraca focus na opener, jeśli wciąż jest w DOM. Zwraca true gdy się udało. */
export function restoreFocus(el: HTMLElement | null): boolean {
  if (!el || !document.contains(el)) return false;
  el.focus({ preventScroll: true });
  return true;
}