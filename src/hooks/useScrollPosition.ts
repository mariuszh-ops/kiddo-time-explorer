import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";

// Store scroll positions by pathname
const scrollPositions = new Map<string, number>();

export function useScrollPosition() {
  const location = useLocation();
  const isRestoring = useRef(false);
  const previousPathname = useRef<string | null>(null);

  // Save scroll position before navigating away
  useEffect(() => {
    // On mount, track the current path
    if (previousPathname.current === null) {
      previousPathname.current = location.pathname;
      return;
    }

    // When pathname changes, save the scroll position for the PREVIOUS path
    if (previousPathname.current !== location.pathname) {
      if (!isRestoring.current) {
        scrollPositions.set(previousPathname.current, window.scrollY);
      }
      previousPathname.current = location.pathname;
    }
  }, [location.pathname]);

  // Restore scroll position when returning to a page
  useEffect(() => {
    // Don't restore scroll for these pages - they should always start at top
    if (location.pathname.startsWith('/activity/') || location.pathname === '/my-places') {
      window.scrollTo(0, 0);
      return;
    }
    
    const savedPosition = scrollPositions.get(location.pathname);
    
    if (savedPosition !== undefined && savedPosition > 0) {
      isRestoring.current = true;
      
      // Use multiple attempts to ensure scroll restoration after animations/rendering
      const restoreScroll = () => {
        window.scrollTo(0, savedPosition);
      };

      // Attempt 1: Immediate RAF for fast renders
      requestAnimationFrame(() => {
        restoreScroll();
        
        // Attempt 2: After a short delay for animation completion
        setTimeout(() => {
          restoreScroll();
          
          // Attempt 3: Final attempt after animations fully settle
          setTimeout(() => {
            restoreScroll();
            isRestoring.current = false;
          }, 100);
        }, 50);
      });
    }
  }, [location.pathname]);

  const savePosition = useCallback(() => {
    scrollPositions.set(location.pathname, window.scrollY);
  }, [location.pathname]);

  const clearPosition = useCallback((pathname?: string) => {
    scrollPositions.delete(pathname || location.pathname);
  }, [location.pathname]);

  return { savePosition, clearPosition };
}
