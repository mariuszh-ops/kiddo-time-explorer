import { Link } from "react-router-dom";

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
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
