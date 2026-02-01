import { Link, useLocation } from "react-router-dom";
import { Heart, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import familyFunLogo from "@/assets/familyfun-logo.png";

const Header = () => {
  const location = useLocation();
  const { isLoggedIn, login } = useAuth();
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
              className="h-[60px] md:h-20 w-auto object-contain"
            />
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1 md:gap-2">
            {isLoggedIn ? (
              <>
                {/* My Places link - logged in only */}
                <Link to="/my-places">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "gap-2 text-muted-foreground hover:text-foreground",
                      isActive("/my-places") && "text-foreground bg-accent"
                    )}
                  >
                    <Heart className="w-4 h-4" />
                    <span className="hidden sm:inline">Moje miejsca</span>
                  </Button>
                </Link>

                {/* Profile button - logged in only */}
                <Link to="/profile">
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
