import { Link, useLocation } from "react-router-dom";
import { Heart, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import familyFunLogo from "@/assets/familyfun-logo.webp";
import { env } from "@/config/env";


const Header = () => {
  const location = useLocation();
  const { isLoggedIn, signInWithGoogle, isDemoMode, toggleDemoMode } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const FALLBACK = window.matchMedia("(min-width: 768px)").matches ? 88 : 72;
    const setVar = () => {
      const h = el.getBoundingClientRect().height || FALLBACK;
      document.documentElement.style.setProperty("--header-h", `${Math.round(h)}px`);
    };
    setVar();

    const hasRO = typeof window !== "undefined" && "ResizeObserver" in window;
    let ro: ResizeObserver | undefined;
    const markSource = (s: "resize-observer" | "fallback") => {
      if (typeof window === "undefined") return;
      window.__ffLayoutSource = window.__ffLayoutSource || {};
      window.__ffLayoutSource.header = s;
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
            "[FamilyFun] Header: ResizeObserver threw, falling back to resize/orientationchange listeners."
          );
        }
      }
    } else {
      markSource("fallback");
      if (env.isDev) {
        console.info(
          "[FamilyFun] Header: ResizeObserver unavailable, using resize/orientationchange fallback. --header-h defaults to",
          getComputedStyle(document.documentElement).getPropertyValue("--header-h").trim() || "72px"
        );
      }
    }
    // Always listen to viewport changes — covers RO-less browsers and
    // breakpoint-driven header height changes.
    window.addEventListener("resize", setVar);
    window.addEventListener("orientationchange", setVar);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", setVar);
      window.removeEventListener("orientationchange", setVar);
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const handleAuthAction = async () => {
    await signInWithGoogle();
    setIsAuthModalOpen(false);
  };

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container flex items-center justify-between h-[72px] md:h-[88px]">
          {/* Logo */}
          <Link to="/" className="flex items-center group min-h-[44px] min-w-[44px] -ml-2 md:-ml-3">
            <img
              src={familyFunLogo}
              alt="FamilyFun"
              width={379}
              height={260}
              fetchPriority="high"
              className="h-[96px] md:h-[130px] w-auto object-contain"
            />
          </Link>

          {/* Navigation */}
          <nav aria-label="Główna nawigacja" className="flex items-center gap-1 md:gap-2">
            {/* Demo Mode Toggle - Development only */}
            {env.isDev && (
              <div className="flex items-center gap-2 px-2 py-1 mr-2 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-md">
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Demo
                </span>
                <Switch
                  checked={isDemoMode}
                  onCheckedChange={toggleDemoMode}
                  className="scale-75 data-[state=checked]:bg-amber-500"
                />
              </div>
            )}

            {isLoggedIn ? (
              <>
                {/* My Places link - desktop only (mobile uses bottom nav) */}
                <Link to="/my-places" className="hidden sm:block">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "gap-2 text-muted-foreground hover:text-foreground",
                      isActive("/my-places") && "text-foreground bg-accent"
                    )}
                  >
                    <Heart className="w-4 h-4" />
                    <span>Moje miejsca</span>
                  </Button>
                </Link>

                {/* Profile button - desktop only (mobile uses bottom nav) */}
                <Link to="/profile" className="hidden sm:block">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "text-muted-foreground hover:text-foreground",
                      isActive("/profile") && "text-foreground bg-accent"
                    )}
                  >
                    <User className="w-5 h-5" />
                    <span className="sr-only">Profil</span>
                  </Button>
                </Link>
              </>
            ) : (
              /* Login button - logged out, desktop only (mobile uses bottom nav) */
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAuthModalOpen(true)}
                className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogIn className="w-4 h-4" />
                <span>Zaloguj się</span>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthRequiredModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onGoogleClick={handleAuthAction}
        onEmailClick={handleAuthAction}
        onLoginClick={handleAuthAction}
      />
    </>
  );
};

export default Header;
