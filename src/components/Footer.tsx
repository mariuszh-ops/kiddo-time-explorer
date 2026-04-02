import { Link } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";
import { FEATURES } from "@/lib/featureFlags";
import { categoryConfigs } from "@/data/categoryPages";

const Footer = () => {
  return (
    <footer style={{ background: 'var(--color-bg-surface-muted)', padding: 'var(--space-12) 0' }} className="border-t border-[var(--color-border-soft)]">
      <div className="container" style={{ padding: '0 var(--space-6)' }}>
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
        {/* Popular categories */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Popularne kategorie</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
            {categoryConfigs
              .filter(c => c.slug !== "")
              .map((cat) => {
                const city = FEATURES.ENABLED_CITIES[0] || "warszawa";
                return (
                  <Link
                    key={cat.slug}
                    to={`/atrakcje/${city}/${cat.slug}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {cat.label}
                  </Link>
                );
              })}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
