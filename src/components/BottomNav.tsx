import { Link, useLocation, useNavigate } from "react-router-dom";
import { Compass, Heart, User } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/lib/featureFlags";
import { env } from "@/config/env";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);

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

  // Hide on activity detail pages (path is /atrakcje/:slug where slug is not a city)
  const atrakcjeMatch = location.pathname.match(/^\/atrakcje\/([^/]+)$/);
  if (atrakcjeMatch) {
    const slug = atrakcjeMatch[1];
    if (!FEATURES.ENABLED_CITIES.includes(slug)) return null;
  }
  // Also hide on /atrakcje/:city/:category detail-like paths that are actually activity slugs
  if (location.pathname.match(/^\/atrakcje\/[^/]+\/[^/]+/)) return null;

  const isActive = (path: string) => location.pathname === path;

  const handleDiscoverClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/", { replace: true });
  };

  const navItems = [
    { label: "Odkrywaj", icon: Compass, path: "/" },
    { label: "Moje", icon: Heart, path: "/my-places" },
    { label: "Profil", icon: User, path: "/profile" },
  ];

  return (
    <nav
      ref={navRef}
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
      style={{
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {navItems.map((item) => {
        const active = item.path === "/"
          ? isActive("/")
          : isActive(item.path);
        const Icon = item.icon;

        const itemClasses = cn(
          "flex-1 flex flex-col items-center justify-center gap-1 transition-colors active:scale-95",
          active ? "text-[hsl(var(--primary))]" : "text-muted-foreground"
        );

          // Odkrywaj: always navigate to list view
          if (item.path === "/") {
            return (
              <button
                key={item.label}
                onClick={handleDiscoverClick}
                className={itemClasses}
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
