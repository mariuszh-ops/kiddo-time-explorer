import { Link, useLocation } from "react-router-dom";
import { MapPin, Heart, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Header = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container flex items-center justify-between h-14 md:h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <MapPin className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg text-foreground">kidsmoment</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 md:gap-2">
          {/* My Places link */}
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

          {/* Profile button (placeholder for future) */}
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
        </nav>
      </div>
    </header>
  );
};

export default Header;
