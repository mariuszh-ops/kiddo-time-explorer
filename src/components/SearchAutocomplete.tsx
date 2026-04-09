import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Send } from "lucide-react";
import { Activity, filterOptions } from "@/data/activities";
import { categoryConfigs, cityLabels } from "@/data/categoryPages";
import { FEATURES } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";

interface SearchAutocompleteProps {
  activities: Activity[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function removeDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\u0142/g, "l").replace(/\u0141/g, "L");
}

function fuzzyMatch(text: string, query: string): boolean {
  return removeDiacritics(text.toLowerCase()).includes(removeDiacritics(query.toLowerCase()));
}

function matchActivity(activity: Activity, query: string): boolean {
  return (
    fuzzyMatch(activity.title, query) ||
    fuzzyMatch(activity.location, query) ||
    fuzzyMatch(activity.city, query) ||
    activity.tags.some((t) => fuzzyMatch(t, query))
  );
}

// Get human-readable category label from type value
function getCategoryLabel(typeValue: string): string {
  const opt = filterOptions.type.find((o) => o.value === typeValue);
  return opt?.label || typeValue;
}

function matchCategories(query: string) {
  const q = query.toLowerCase();
  const matches: { slug: string; emoji: string; label: string; city: string; cityLabel: string; path: string }[] = [];

  for (const city of FEATURES.ENABLED_CITIES) {
    const cityLabel = cityLabels[city]?.nominative || city;
    for (const cat of categoryConfigs) {
      if (!cat.slug) continue;
      if (fuzzyMatch(cat.label, q) || fuzzyMatch(cat.slug, q)) {
        matches.push({
          slug: cat.slug,
          emoji: cat.emoji,
          label: cat.label,
          city,
          cityLabel,
          path: `/atrakcje/${city}/${cat.slug}`,
        });
      }
    }
  }
  return matches.slice(0, 3);
}

const SearchAutocomplete = ({
  activities,
  searchQuery,
  onSearchChange,
}: SearchAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(searchQuery);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [debouncedQuery, setDebouncedQuery] = useState(inputValue);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue]);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const matchingActivities = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    return activities.filter((a) => matchActivity(a, debouncedQuery)).slice(0, 5);
  }, [activities, debouncedQuery]);

  const matchingCategories = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    return matchCategories(debouncedQuery);
  }, [debouncedQuery]);

  const totalResults = matchingActivities.length + matchingCategories.length;
  const showDropdown = isOpen && debouncedQuery.length >= 2;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = useCallback(
    (index: number) => {
      if (index < matchingActivities.length) {
        const activity = matchingActivities[index];
        navigate(`/atrakcje/${activity.slug}`);
        setIsOpen(false);
      } else {
        const catIndex = index - matchingActivities.length;
        const cat = matchingCategories[catIndex];
        if (cat) {
          navigate(cat.path);
          setIsOpen(false);
        }
      }
    },
    [matchingActivities, matchingCategories, navigate]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!showDropdown) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < totalResults - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalResults - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0) {
        handleSelect(selectedIndex);
      } else {
        onSearchChange(inputValue);
        setIsOpen(false);
      }
    }
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    setSelectedIndex(-1);
    setIsOpen(true);
    if (!val.trim()) {
      onSearchChange("");
    }
  };

  const handleClear = () => {
    setInputValue("");
    onSearchChange("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Szukaj atrakcji..."
          className="pl-9 pr-8 py-2 w-48 md:w-56 rounded-full text-sm bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          autoComplete="off"
        />
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute top-full left-0 mt-1 bg-white border border-border overflow-y-auto min-w-[320px] z-50"
          style={{
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(31,42,36,0.1)",
            maxHeight: "400px",
          }}
        >
          {totalResults === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Nie znaleziono atrakcji</p>
              <button
                onClick={() => {
                  setIsOpen(false);
                  const cta = document.querySelector('[data-submit-cta]');
                  if (cta) cta.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Send className="w-3.5 h-3.5" />
                Zgłoś nowe miejsce
              </button>
            </div>
          ) : (
            <>
              {/* Activities section */}
              {matchingActivities.length > 0 && (
                <div className="py-1">
                  <p className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Atrakcje
                  </p>
                  {matchingActivities.map((activity, i) => (
                    <button
                      key={activity.id}
                      onClick={() => handleSelect(i)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className="w-full flex items-center gap-3 text-left transition-colors"
                      style={{
                        padding: "10px 16px",
                        backgroundColor: selectedIndex === i ? "hsl(var(--accent))" : "transparent",
                      }}
                    >
                      <img
                        src={activity.imageUrl}
                        alt={activity.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0 bg-muted"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-foreground truncate block">
                          {activity.title}
                        </span>
                        <span className="text-xs text-muted-foreground truncate block">
                          {activity.city} · {getCategoryLabel(activity.type)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Categories section */}
              {matchingCategories.length > 0 && (
                <div className="py-1 border-t border-border">
                  <p className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Kategorie
                  </p>
                  {matchingCategories.map((cat, i) => {
                    const globalIndex = matchingActivities.length + i;
                    return (
                      <button
                        key={cat.path}
                        onClick={() => handleSelect(globalIndex)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className="w-full flex items-center gap-3 text-left transition-colors"
                        style={{
                          padding: "10px 16px",
                          backgroundColor: selectedIndex === globalIndex ? "#F3F7F2" : "transparent",
                        }}
                      >
                        <span className="text-base">{cat.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{cat.label}</p>
                          <p className="text-xs text-muted-foreground">{cat.cityLabel}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Enter hint */}
              <div className="px-4 py-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd>
                  {" "}szukaj w liście · <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">↑↓</kbd>
                  {" "}nawiguj · <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Esc</kbd>
                  {" "}zamknij
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
