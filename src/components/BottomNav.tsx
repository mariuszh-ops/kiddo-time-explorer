import { Link, useLocation, useNavigate } from "react-router-dom";
import { Compass, Heart, Map, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { env } from "@/config/env";
import { useAuth } from "@/contexts/AuthContext";


/** Pola, w ktorych telefon podnosi klawiature ekranowa. */
const TYPING_INPUT_TYPES = new Set([
  "text", "search", "email", "url", "tel", "password", "number", "date", "datetime-local", "month", "time", "week",
]);

const isTypingElement = (el: Element | null): boolean => {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return TYPING_INPUT_TYPES.has(el.type);
  return el instanceof HTMLElement && el.isContentEditable;
};

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);
  const { isLoggedIn } = useAuth();
  /**
   * K-24: przy otwartej klawiaturze dolna nawigacja zostawala nad nia i zaslaniala
   * pole opinii (bottom 472 > nav 436). Chowamy pasek, gdy fokus siedzi w polu
   * tekstowym ALBO gdy widoczny viewport skurczyl sie o wiecej niz 150 px.
   */
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    const check = () => {
      // Pasek i tak nie istnieje od md w gore — nie ma po co przeliczac i re-renderowac.
      if (window.matchMedia("(min-width: 768px)").matches) {
        setKeyboardOpen(false);
        return;
      }
      const typing = isTypingElement(document.activeElement);
      const shrunk = vv ? vv.height < window.innerHeight - 150 : false;
      setKeyboardOpen(typing || shrunk);
    };
    check();
    document.addEventListener("focusin", check);
    document.addEventListener("focusout", check);
    vv?.addEventListener("resize", check);
    window.addEventListener("resize", check);
    return () => {
      document.removeEventListener("focusin", check);
      document.removeEventListener("focusout", check);
      vv?.removeEventListener("resize", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  useEffect(() => {
    const el = navRef.current;
    const root = document.documentElement;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const FALLBACK = isMobile ? 64 : 0;
    if (!el) {
      root.style.setProperty("--bottom-nav-h", `${FALLBACK}px`);
      return;
    }
    const setVar = () => {
      const h = el.getBoundingClientRect().height || FALLBACK;
      root.style.setProperty("--bottom-nav-h", `${Math.round(h)}px`);
    };
    setVar();

    const hasRO = typeof window !== "undefined" && "ResizeObserver" in window;
    let ro: ResizeObserver | undefined;
    const markSource = (s: "resize-observer" | "fallback") => {
      if (typeof window === "undefined") return;
      window.__ffLayoutSource = window.__ffLayoutSource || {};
      window.__ffLayoutSource.bottomNav = s;
    };
    if (hasRO) {
      try {
        ro = new ResizeObserver(setVar);
        ro.observe(el);
        markSource("resize-observer");
      } catch {
        ro = undefined;
        markSource("fallback");
        if (env.isDev) {
          console.info(
            "[FamilyFun] BottomNav: ResizeObserver threw, using resize/orientationchange fallback. --bottom-nav-h =",
            `${FALLBACK}px`
          );
        }
      }
    } else {
      markSource("fallback");
      if (env.isDev) {
        console.info(
          "[FamilyFun] BottomNav: ResizeObserver unavailable, using resize/orientationchange fallback. --bottom-nav-h =",
          `${FALLBACK}px`
        );
      }
    }
    window.addEventListener("resize", setVar);
    window.addEventListener("orientationchange", setVar);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", setVar);
      window.removeEventListener("orientationchange", setVar);
      // Reset to media-query default (desktop = 0, mobile fallback = 64)
      root.style.setProperty(
        "--bottom-nav-h",
        window.matchMedia("(min-width: 768px)").matches ? "0px" : `${FALLBACK}px`
      );
    };
  }, [location.pathname]);

  // Hide on admin page
  if (location.pathname.startsWith("/admin")) return null;

  const isActive = (path: string) => location.pathname === path;
  const isMapView = location.search.includes("view=map");

  // „Odkrywaj” jest aktywne na wszystkich trasach przeglądania katalogu:
  // /, /:region, /:region/:kategoria, /atrakcje/:miasto/:kategoria, /kategoria/:slug,
  // /atrakcje/:slug (karta atrakcji).
  const NON_CATALOG_PREFIXES = [
    "/my-places",
    "/profile",
    "/inspiracje",
    "/o-nas",
    "/kontakt",
    "/regulamin",
    "/polityka-prywatnosci",
    "/reset-password",
    "/oauth",
  ];
  const isCatalogRoute =
    !isMapView &&
    !NON_CATALOG_PREFIXES.some((p) => location.pathname.startsWith(p));

  const handleDiscoverClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/");
  };

  const handleMapClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/?view=map");
  };

  const navItems = [
    { label: "Odkrywaj", icon: Compass, path: "/", isMap: false },
    { label: "Mapa", icon: Map, path: "/", isMap: true },
    { label: "Moje", icon: Heart, path: "/my-places", isMap: false },
    { label: isLoggedIn ? "Profil" : "Zaloguj", icon: User, path: "/profile", isMap: false },
  ];

  return (
    <nav
      ref={navRef}
      aria-label="Nawigacja dolna"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.08)]",
        keyboardOpen && "hidden"
      )}
      style={{
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {navItems.map((item) => {
        const active = item.isMap
          ? isMapView
          : item.path === "/"
            ? isCatalogRoute
            : isActive(item.path);
        const Icon = item.icon;

        const itemClasses = cn(
          "flex-1 flex flex-col items-center justify-center gap-1 transition-colors active:scale-95 min-h-[44px]",
          active ? "text-[hsl(var(--primary))]" : "text-muted-foreground"
        );

        if (item.path === "/" && !item.isMap) {
          return (
            <button
              key={item.label}
              onClick={handleDiscoverClick}
              className={itemClasses}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.2 : 1.5} />
              <span className="text-[10px] leading-none font-medium">{item.label}</span>
            </button>
          );
        }

        if (item.isMap) {
          return (
            <button
              key={item.label}
              onClick={handleMapClick}
              className={itemClasses}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.2 : 1.5} />
              <span className="text-[10px] leading-none font-medium">{item.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={item.label}
            to={item.path}
            className={itemClasses}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.2 : 1.5} />
            <span className="text-[10px] leading-none font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
