import { Link, useLocation } from "react-router-dom";
import { Heart, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import familyFunLogo from "@/assets/familyfun-logo.png";

// Check if we're in development mode
const isDevelopment = import.meta.env.DEV;

const Header = () => {
  const location = useLocation();
  const { isLoggedIn, login, isDemoMode, toggleDemoMode } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;

  const handleAuthAction = () => {
    // Simulate successful login for design purposes
    login();
    setIsAuthModalOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img 
              src={familyFunLogo} 
              alt="FamilyFun" 
              className="h-[120px] md:h-[150px] w-auto object-contain -ml-3 md:-ml-4"
            />
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1 md:gap-2">
            {/* Demo Mode Toggle - Development only */}
            {isDevelopment && (
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
                {/* Mobile: Single icon for My Places - one-tap access */}
                <Link to="/my-places" className="sm:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "text-muted-foreground hover:text-foreground",
                      isActive("/my-places") && "text-foreground bg-accent"
                    )}
                  >
                    <Heart className="w-5 h-5" />
                    <span className="sr-only">Moje miejsca</span>
                  </Button>
                </Link>

                {/* Desktop: My Places link with label */}
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

                {/* Desktop: Profile button - hidden on mobile */}
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
              /* Login button - logged out only */
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAuthModalOpen(true)}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Zaloguj się</span>
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
