import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

/**
 * Kompaktowa wyszukiwarka w headerze na stronach listingowych.
 * Enter → /?search=... (identycznie jak HomeSearch na stronie głównej).
 */
const HeaderSearch = () => {
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    navigate(`/?search=${encodeURIComponent(q)}`);
  };

  return (
    <form onSubmit={submit} role="search" className="relative flex-1 max-w-xs md:max-w-sm mx-2">
      <label htmlFor="header-search" className="sr-only">
        Szukaj atrakcji, miasta lub kategorii
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
      />
      <input
        id="header-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Szukaj atrakcji…"
        aria-label="Szukaj atrakcji, miasta lub kategorii"
        autoComplete="off"
        className="w-full h-10 pl-9 pr-3 rounded-full bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
      />
    </form>
  );
};

export default HeaderSearch;