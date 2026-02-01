import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// Store scroll positions by pathname
const scrollPositions = new Map<string, number>();

export function useScrollPosition() {
  const location = useLocation();
  const isRestoring = useRef(false);

  // Save scroll position before navigating away
  useEffect(() => {
    const handleBeforeUnload = () => {
      scrollPositions.set(location.pathname, window.scrollY);
    };

    // Save on navigation
    return () => {
      if (!isRestoring.current) {
        scrollPositions.set(location.pathname, window.scrollY);
      }
    };
  }, [location.pathname]);

  // Restore scroll position when returning to a page (skip for pages that handle their own scroll)
  useEffect(() => {
    // Don't restore scroll for these pages - they should always start at top
    if (location.pathname.startsWith('/activity/') || location.pathname === '/my-places') {
      return;
    }
    
    const savedPosition = scrollPositions.get(location.pathname);
    
    if (savedPosition !== undefined && savedPosition > 0) {
      isRestoring.current = true;
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo(0, savedPosition);
        isRestoring.current = false;
      });
    }
  }, [location.pathname]);

  return {
    savePosition: () => {
      scrollPositions.set(location.pathname, window.scrollY);
    },
    clearPosition: (pathname?: string) => {
      scrollPositions.delete(pathname || location.pathname);
    },
  };
}
