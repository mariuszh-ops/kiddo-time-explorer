import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Compass, Map, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/lib/featureFlags";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  const isMapView = location.pathname === "/" && searchParams.get("view") === "map";
  const isActive = (path: string) => location.pathname === path;

  const handleDiscoverClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Always go to list view — strip ?view=map
    navigate("/", { replace: true });
  };

  const handleMapClick = () => {
    navigate("/?view=map");
  };

  const navItems = [
    { label: "Odkrywaj", icon: Compass, path: "/" },
    { label: "Mapa", icon: Map, path: "MAP_ACTION" },
    { label: "Ulubione", icon: Heart, path: "/my-places" },
    { label: "Profil", icon: User, path: "/profile" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
      style={{
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {navItems.map((item) => {
        const active = item.path === "MAP_ACTION" 
          ? isMapView
          : item.path === "/"
          ? (isActive("/") && !isMapView)
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
  );
};

export default BottomNav;
