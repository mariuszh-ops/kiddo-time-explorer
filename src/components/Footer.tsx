import { Link } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";
import { FEATURES } from "@/lib/featureFlags";

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-8">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 FamilyFun. Wszystkie prawa zastrzeżone.
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/regulamin" className="hover:text-foreground transition-colors">
              Regulamin
            </Link>
            <Link to="/polityka-prywatnosci" className="hover:text-foreground transition-colors">
              Polityka prywatności
            </Link>
            <Link to="/kontakt" className="hover:text-foreground transition-colors">
              Kontakt
            </Link>
            <Link to="/o-nas" className="hover:text-foreground transition-colors">
              O nas
            </Link>
            {FEATURES.BLOG && (
              <Link to="/inspiracje" className="hover:text-foreground transition-colors">
                Inspiracje
              </Link>
            )}
          </div>
          {FEATURES.SOCIAL_LINKS && (
            <div className="flex items-center gap-4">
              <a href="https://instagram.com/familyfun.pl" target="_blank" rel="noopener noreferrer"
                 className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="https://facebook.com/familyfunpl" target="_blank" rel="noopener noreferrer"
                 className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
