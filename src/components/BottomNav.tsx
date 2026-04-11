import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Compass, Map, Heart, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import AuthRequiredModal from "./AuthRequiredModal";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, login } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Hide on admin page and activity detail pages
  if (location.pathname.startsWith("/admin")) return null;
  if (location.pathname.match(/^\/atrakcje\/[^/]+\/[^/]+/)) return null;

  const isActive = (path: string) => location.pathname === path;

  const handleAuthAction = () => {
    login();
    setIsAuthOpen(false);
  };

  const handleMapClick = () => {
    // Navigate to home and trigger map view via URL search param
    navigate("/?view=map");
  };

  const navItems = [
    { label: "Odkrywaj", icon: Compass, path: "/" },
    { label: "Mapa", icon: Map, path: "MAP_ACTION" },
    { label: "Ulubione", icon: Heart, path: "/my-places" },
    { label: "Blog", icon: BookOpen, path: "/inspiracje" },
  ];

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
        style={{
          height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {navItems.map((item) => {
          const active = item.path === "MAP_ACTION" 
            ? location.search.includes("view=map") 
            : isActive(item.path);
          const Icon = item.icon;

          const itemClasses = cn(
            "flex-1 flex flex-col items-center justify-center gap-1 transition-colors active:scale-95",
            active ? "text-[hsl(var(--primary))]" : "text-muted-foreground"
          );

          // Ulubione: if not logged in, show auth modal
          if (item.path === "/my-places" && !isLoggedIn) {
            return (
              <button
                key={item.label}
                onClick={() => setIsAuthOpen(true)}
                className={cn(itemClasses, "text-muted-foreground")}
              >
                <Icon className="w-[22px] h-[22px]" strokeWidth={1.5} />
                <span className="text-[10px] leading-none font-medium">{item.label}</span>
              </button>
            );
          }

          // Map: special action
          if (item.path === "MAP_ACTION") {
            return (
              <button
                key={item.label}
                onClick={handleMapClick}
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

      <AuthRequiredModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onGoogleClick={handleAuthAction}
        onEmailClick={handleAuthAction}
        onLoginClick={handleAuthAction}
      />
    </>
  );
};

export default BottomNav;
