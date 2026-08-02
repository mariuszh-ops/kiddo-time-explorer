/**
 * Śledzi ostatni element z focusem POZA modalem, żeby po zamknięciu
 * (także klawiszem Esc) przywrócić focus na element, który modal otworzył.
 */
let lastFocusedOutside: HTMLElement | null = null;

const FOCUSABLE = 'button,[role="button"],a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';

const isInsideOverlay = (el: HTMLElement) =>
  Boolean(el.closest('[role="dialog"],[data-radix-popper-content-wrapper]'));

if (typeof document !== "undefined") {
  document.addEventListener(
    "focusin",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function") return;
      // Pomijamy body i focus-guardy Radixa — to nie są realne openery.
      if (target === document.body || target === document.documentElement) return;
      if (target.hasAttribute("data-radix-focus-guard")) return;
      if (isInsideOverlay(target)) return;
      lastFocusedOutside = target;
    },
    true,
  );

  // Kliknięcie/tap nie zawsze ustawia focus (Safari), a to zwykle właśnie
  // klikany przycisk otwiera modal — zapamiętujemy go jako opener.
  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function") return;
      const focusable = target.closest(FOCUSABLE) as HTMLElement | null;
      if (!focusable || isInsideOverlay(focusable)) return;
      lastFocusedOutside = focusable;
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