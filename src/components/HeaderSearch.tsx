import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { REGION_SLUGS } from "@/data/regions";
import { SEARCH_PLACEHOLDER } from "@/lib/searchConfig";

/**
 * Kompaktowa wyszukiwarka w headerze na stronach listingowych.
 * Zachowuje kontekst: na stronie województwa/kategorii Enter zawęża wyniki
 * do tej strony (`/malopolskie?search=zoo`), poza nią szuka ogólnopolsko.
 */
const HeaderSearch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";
  const [value, setValue] = useState(urlSearch);
  // Odtwarzaj frazę z URL (m.in. po „wstecz" z karty atrakcji).
  useEffect(() => {
    setValue(urlSearch);
  }, [urlSearch]);

  const segments = location.pathname.split("/").filter(Boolean);
  const isRegionPath = segments.length > 0 && (REGION_SLUGS as readonly string[]).includes(segments[0]);
  const isAtrakcjeRegionPath =
    segments[0] === "atrakcje" && segments[1] && (REGION_SLUGS as readonly string[]).includes(segments[1]);
  const isCategoryPath = segments[0] === "kategoria" && Boolean(segments[1]);
  const keepsContext = Boolean(isRegionPath || isAtrakcjeRegionPath || isCategoryPath);

  /** Usuwa wyłącznie parametr `search`, zachowując pozostałe filtry i trasę. */
  const clearSearchParam = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("search");
    const qs = next.toString();
    navigate(`${location.pathname}${qs ? `?${qs}` : ""}`, { replace: true });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) {
      // Enter w pustym polu = usunięcie frazy z URL (filtry zostają).
      clearSearchParam();
      return;
    }
    if (keepsContext) {
      const next = new URLSearchParams(searchParams);
      next.set("search", q);
      navigate(`${location.pathname}?${next.toString()}`);
      return;
    }
    navigate(`/?search=${encodeURIComponent(q)}`);
  };

  const handleClear = () => {
    setValue("");
    clearSearchParam();
  };

  return (
    <form onSubmit={submit} role="search" className="relative flex-1 max-w-xs md:max-w-sm mx-2">
      <label htmlFor="header-search" className="sr-only">
        {SEARCH_PLACEHOLDER}
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
        placeholder={SEARCH_PLACEHOLDER}
        aria-label={SEARCH_PLACEHOLDER}
        autoComplete="off"
        className="w-full h-11 md:h-10 pl-9 pr-11 rounded-full bg-secondary border border-border text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Wyczyść wyszukiwanie"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
};

export default HeaderSearch;
