import { useEffect, useLayoutEffect, useRef, useCallback, useState } from "react";
import { useLocation } from "react-router-dom";

// Store scroll positions by pathname - outside component to persist across mounts
const scrollPositions = new Map<string, number>();

// Export function to save scroll position imperatively (before navigation)
export function saveScrollPositionForPath(pathname: string) {
  scrollPositions.set(pathname, window.scrollY);
}

// Check if a path has a saved scroll position (for pre-render checks)
export function hasSavedScrollPosition(pathname: string): boolean {
  const pos = scrollPositions.get(pathname);
  return pos !== undefined && pos > 0;
}

// Get saved scroll position for a path
export function getSavedScrollPosition(pathname: string): number | undefined {
  return scrollPositions.get(pathname);
}

/**
 * Co zrobic z przewinieciem przy montazu strony:
 * - "zapisana": przywroc pozycje zapisana dla pathname (dotychczasowe zachowanie),
 * - "gora": nowy wpis historii — zacznij od gory strony,
 * - "reczny": na razie gora strony, docelowa pozycje ustawia wywolujacy, gdy
 *   tresc jest gotowa (FMN-B03: lista po "wstecz" doczytuje dane PO montazu,
 *   a przewiniecie ustawione od razu przegladarka przycina do wysokosci szkieletu).
 */
export type TrybPrzewiniecia = "zapisana" | "gora" | "reczny";

export function useScrollPosition(tryb: TrybPrzewiniecia = "zapisana") {
  const location = useLocation();
  const previousPathnameRef = useRef(location.pathname);
  const [isScrollRestored, setIsScrollRestored] = useState(false);

  // Save current scroll position for the current path
  const savePosition = useCallback(() => {
    scrollPositions.set(location.pathname, window.scrollY);
  }, [location.pathname]);

  // Clear stored position
  const clearPosition = useCallback((pathname?: string) => {
    scrollPositions.delete(pathname || location.pathname);
  }, [location.pathname]);

  // Update previous pathname ref on route change
  useEffect(() => {
    previousPathnameRef.current = location.pathname;
  }, [location.pathname]);

  // Use useLayoutEffect for synchronous scroll restoration BEFORE paint
  useLayoutEffect(() => {
    // Skip restoration for detail pages and my-places - they handle their own scroll
    if (location.pathname.startsWith('/activity/') || location.pathname === '/my-places') {
      window.scrollTo(0, 0);
      setIsScrollRestored(true);
      return;
    }
    
    if (tryb !== "zapisana") {
      window.scrollTo(0, 0);
    } else {
      const savedPosition = scrollPositions.get(location.pathname);
      if (savedPosition !== undefined && savedPosition > 0) {
        // Restore immediately, synchronously before paint
        window.scrollTo(0, savedPosition);
      }
    }

    setIsScrollRestored(true);
  }, [location.pathname, tryb]);

  // Reset scroll restored state when navigating away
  useEffect(() => {
    return () => {
      setIsScrollRestored(false);
    };
  }, [location.pathname]);

  return { savePosition, clearPosition, isScrollRestored };
}
