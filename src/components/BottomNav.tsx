import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Compass, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import AuthRequiredModal from "./AuthRequiredModal";

const BottomNav = () => {
  const location = useLocation();
  const { isLoggedIn, login } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Hide on admin page
  if (location.pathname.startsWith("/admin")) return null;

  const isActive = (path: string) => location.pathname === path;

  const handleAuthAction = () => {
    login();
    setIsAuthOpen(false);
  };

  const navItems = [
    { label: "Odkrywaj", icon: Compass, path: "/" },
    { label: "Zapisane", icon: Heart, path: "/my-places" },
    { label: "Profil", icon: User, path: "/profile" },
  ];

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden border-t border-[var(--color-border-soft)]"
        style={{
          background: 'var(--color-bg-surface)',
          boxShadow: '0 -4px 16px var(--color-shadow-soft)',
          paddingTop: 'var(--space-2)',
          paddingBottom: 'calc(var(--space-3) + env(safe-area-inset-bottom, 0px))',
          minHeight: 'calc(78px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          const itemClasses = cn(
            "flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-150 ease-in-out active:scale-95",
            active ? "text-[var(--color-brand-primary)]" : "text-[var(--color-text-muted)]"
          );

          // Profile tab: if not logged in, show auth modal instead of navigating
          if (item.path === "/profile" && !isLoggedIn) {
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
