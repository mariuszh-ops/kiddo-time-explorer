import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

// Store scroll positions by pathname - outside component to persist across mounts
const scrollPositions = new Map<string, number>();

// Export function to save scroll position imperatively (before navigation)
export function saveScrollPositionForPath(pathname: string) {
  scrollPositions.set(pathname, window.scrollY);
}

export function useScrollPosition() {
  const location = useLocation();
  const previousPathnameRef = useRef(location.pathname);

  // Save current scroll position for the current path
  const savePosition = useCallback(() => {
    scrollPositions.set(location.pathname, window.scrollY);
  }, [location.pathname]);

  // Clear stored position
  const clearPosition = useCallback((pathname?: string) => {
    scrollPositions.delete(pathname || location.pathname);
  }, [location.pathname]);

  // Update previous pathname ref on route change (no longer saving scroll here)
  useEffect(() => {
    previousPathnameRef.current = location.pathname;
  }, [location.pathname]);

  // Restore scroll position when arriving at a page
  useEffect(() => {
    // Skip restoration for detail pages and my-places - they handle their own scroll
    if (location.pathname.startsWith('/activity/') || location.pathname === '/my-places') {
      window.scrollTo(0, 0);
      return;
    }
    
    const savedPosition = scrollPositions.get(location.pathname);
    
    if (savedPosition !== undefined && savedPosition > 0) {
      // Schedule restoration after React finishes rendering
      const timeoutId = setTimeout(() => {
        window.scrollTo(0, savedPosition);
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname]);

  return { savePosition, clearPosition };
}
