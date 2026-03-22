import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Compass, Heart, PlusCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import SubmitActivityModal from "./SubmitActivityModal";
import AuthRequiredModal from "./AuthRequiredModal";

const BottomNav = () => {
  const location = useLocation();
  const { isLoggedIn, login } = useAuth();
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Hide on admin page
  if (location.pathname.startsWith("/admin")) return null;

  const isActive = (path: string) => location.pathname === path;

  const handleProfileClick = () => {
    if (!isLoggedIn) {
      setIsAuthOpen(true);
    }
  };

  const handleAuthAction = () => {
    login();
    setIsAuthOpen(false);
  };

  const navItems = [
    { label: "Odkrywaj", icon: Compass, path: "/", type: "link" as const },
    { label: "Moje miejsca", icon: Heart, path: "/my-places", type: "link" as const },
    { label: "Dodaj", icon: PlusCircle, path: "", type: "action" as const, action: () => setIsSubmitOpen(true) },
    { label: "Profil", icon: User, path: "/profile", type: "link" as const },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden bg-background/95 backdrop-blur-sm border-t border-border h-16 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const active = item.type === "link" && isActive(item.path);
          const Icon = item.icon;

          if (item.type === "action") {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground active:scale-95 transition-all"
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-[10px] leading-tight">{item.label}</span>
              </button>
            );
          }

          // Profile tab: if not logged in, show auth modal instead of navigating
          if (item.path === "/profile" && !isLoggedIn) {
            return (
              <button
                key={item.label}
                onClick={handleProfileClick}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted-foreground active:scale-95 transition-all"
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-[10px] leading-tight">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
              <span className="text-[10px] leading-tight font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <SubmitActivityModal isOpen={isSubmitOpen} onClose={() => setIsSubmitOpen(false)} />
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
