import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, MapPin, Star, Home, TreePine, Send } from "lucide-react";
import { Activity } from "@/data/activities";
import { categoryConfigs, cityLabels } from "@/data/categoryPages";
import { FEATURES } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";

interface SearchAutocompleteProps {
  activities: Activity[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface CategoryMatch {
  slug: string;
  emoji: string;
  label: string;
  city: string;
  cityLabel: string;
  path: string;
}

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  return lower.includes(q);
}

function matchActivity(activity: Activity, query: string): boolean {
  return (
    fuzzyMatch(activity.title, query) ||
    fuzzyMatch(activity.location, query) ||
    fuzzyMatch(activity.type, query) ||
    fuzzyMatch(activity.city, query) ||
    activity.tags.some((t) => fuzzyMatch(t, query))
  );
}

function matchCategories(query: string): CategoryMatch[] {
  const q = query.toLowerCase();
  const matches: CategoryMatch[] = [];

  for (const city of FEATURES.ENABLED_CITIES) {
    const cityLabel = cityLabels[city]?.nominative || city;
    for (const cat of categoryConfigs) {
      if (!cat.slug) continue; // skip "all"
      if (
        fuzzyMatch(cat.label, q) ||
        fuzzyMatch(cat.slug, q)
      ) {
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

  // Debounced filtering
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

  // Sync external searchQuery changes
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const matchingActivities = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    return activities.filter((a) => matchActivity(a, debouncedQuery)).slice(0, 6);
  }, [activities, debouncedQuery]);

  const matchingCategories = useMemo(() => {
    if (debouncedQuery.length < 2) return [];
    return matchCategories(debouncedQuery);
  }, [debouncedQuery]);

  const totalResults = matchingActivities.length + matchingCategories.length;
  const showDropdown = isOpen && debouncedQuery.length >= 2;

  // Click outside
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
        // Standard grid filtering
        onSearchChange(inputValue);
        setIsOpen(false);
      }
    }
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    setSelectedIndex(-1);
    setIsOpen(true);
    // If cleared, reset grid filter too
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
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-md z-50 max-h-[400px] overflow-y-auto min-w-[280px]">
          {totalResults === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Nie znaleziono atrakcji</p>
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Scroll to submit CTA or open modal
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
                <div className="p-1">
                  <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Atrakcje
                  </p>
                  {matchingActivities.map((activity, i) => (
                    <button
                      key={activity.id}
                      onClick={() => handleSelect(i)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                        selectedIndex === i
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {activity.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {activity.isIndoor ? (
                          <Home className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <TreePine className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {activity.rating}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Categories section */}
              {matchingCategories.length > 0 && (
                <div className="p-1 border-t border-border">
                  <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Kategorie
                  </p>
                  {matchingCategories.map((cat, i) => {
                    const globalIndex = matchingActivities.length + i;
                    return (
                      <button
                        key={cat.path}
                        onClick={() => handleSelect(globalIndex)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                          selectedIndex === globalIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        )}
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
              <div className="px-3 py-2 border-t border-border">
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
