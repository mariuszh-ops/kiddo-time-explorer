import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Search, X } from "lucide-react";
import { getActivities, filterOptions } from "@/data/activities";
import { categoryConfigs, cityLabels } from "@/data/categoryPages";
import { FEATURES } from "@/lib/featureFlags";
import { useDataStatus } from "@/hooks/useDataStatus";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0142/g, "l")
    .replace(/\u0141/g, "l")
    .toLowerCase();
}

function fuzzy(text: string, q: string): boolean {
  return normalize(text).includes(normalize(q));
}

function getCategoryLabel(typeValue: string): string {
  return filterOptions.type.find((o) => o.value === typeValue)?.label || typeValue;
}

interface CategoryMatch {
  slug: string;
  emoji: string;
  label: string;
  city: string;
  cityLabel: string;
  path: string;
}

function matchCategories(q: string): CategoryMatch[] {
  const out: CategoryMatch[] = [];
  for (const city of FEATURES.ENABLED_CITIES) {
    const cityLabel = cityLabels[city]?.nominative || city;
    for (const cat of categoryConfigs) {
      if (!cat.slug) continue;
      if (fuzzy(cat.label, q) || fuzzy(cat.slug, q) || fuzzy(cityLabel, q)) {
        out.push({
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
  return out.slice(0, 4);
}

const HomeSearch = () => {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [debounced, setDebounced] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = "home-search-listbox";

  // Reaguje na załadowanie katalogu — bez tego memo zamrażałoby puste dane.
  const dataStatus = useDataStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activities = useMemo(() => getActivities(), [dataStatus]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 150);
    return () => clearTimeout(t);
  }, [value]);

  const matchingActivities = useMemo(() => {
    if (debounced.trim().length < 2) return [];
    const q = debounced.trim();
    return activities
      .filter(
        (a) =>
          fuzzy(a.title, q) ||
          fuzzy(a.location, q) ||
          fuzzy(a.city, q) ||
          fuzzy(getCategoryLabel(a.type), q) ||
          a.tags.some((t) => fuzzy(t, q))
      )
      .slice(0, 6);
  }, [activities, debounced]);

  const matchingCategories = useMemo(() => {
    if (debounced.trim().length < 2) return [];
    return matchCategories(debounced.trim());
  }, [debounced]);

  const total = matchingActivities.length + matchingCategories.length;
  const showDropdown = isOpen && debounced.trim().length >= 2;

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
        const a = matchingActivities[index];
        navigate(`/atrakcje/${a.slug}`);
      } else {
        const cat = matchingCategories[index - matchingActivities.length];
        if (cat) navigate(cat.path);
      }
      setIsOpen(false);
    },
    [matchingActivities, matchingCategories, navigate]
  );

  const submitSearch = () => {
    if (!value.trim()) return;
    navigate(`/?search=${encodeURIComponent(value.trim())}`);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (showDropdown && selectedIndex >= 0) {
        handleSelect(selectedIndex);
      } else {
        submitSearch();
      }
      return;
    }
    if (!showDropdown || total === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((p) => (p < total - 1 ? p + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((p) => (p > 0 ? p - 1 : total - 1));
    }
  };

  return (
    <section className="container py-4 md:py-6">
      <div ref={containerRef} className="relative mx-auto max-w-2xl">
        <label htmlFor="home-search" className="sr-only">
          Szukaj atrakcji, miasta lub kategorii
        </label>
        <div className="relative flex items-center">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
          />
          <input
            ref={inputRef}
            id="home-search"
            type="search"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSelectedIndex(-1);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Szukaj atrakcji, miasta…"
            aria-label="Szukaj atrakcji, miasta lub kategorii"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            role="combobox"
            autoComplete="off"
            className="w-full h-12 md:h-14 pl-12 pr-12 rounded-full bg-secondary border border-border text-base focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              aria-label="Wyczyść wyszukiwanie"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 inline-flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {showDropdown && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-full mt-2 bg-popover border border-border overflow-y-auto z-50"
            style={{
              borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(31,42,36,0.1)",
              maxHeight: "420px",
            }}
          >
            {total === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Nie znaleziono dopasowań dla „{debounced.trim()}"
                </p>
              </div>
            ) : (
              <>
                {matchingActivities.length > 0 && (
                  <div className="py-1">
                    <p className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Atrakcje
                    </p>
                    {matchingActivities.map((a, i) => (
                      <button
                        key={a.id}
                        type="button"
                        role="option"
                        aria-selected={selectedIndex === i}
                        onClick={() => handleSelect(i)}
                        onMouseEnter={() => setSelectedIndex(i)}
                        className="w-full flex items-center gap-3 text-left px-4 py-2.5 min-h-[44px] transition-colors"
                        style={{
                          backgroundColor: selectedIndex === i ? "hsl(var(--accent))" : "transparent",
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className="w-10 h-10 rounded-lg shrink-0 bg-muted flex items-center justify-center"
                        >
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-foreground truncate block">
                            {a.title}
                          </span>
                          <span className="text-xs text-muted-foreground truncate block">
                            {a.city} · {getCategoryLabel(a.type)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {matchingCategories.length > 0 && (
                  <div className="py-1 border-t border-border">
                    <p className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Kategorie
                    </p>
                    {matchingCategories.map((cat, i) => {
                      const gi = matchingActivities.length + i;
                      return (
                        <button
                          key={cat.path}
                          type="button"
                          role="option"
                          aria-selected={selectedIndex === gi}
                          onClick={() => handleSelect(gi)}
                          onMouseEnter={() => setSelectedIndex(gi)}
                          className="w-full flex items-center gap-3 text-left px-4 py-2.5 min-h-[44px] transition-colors"
                          style={{
                            backgroundColor:
                              selectedIndex === gi ? "hsl(var(--accent))" : "transparent",
                          }}
                        >
                          <span className="text-base" aria-hidden="true">
                            {cat.emoji}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{cat.label}</p>
                            <p className="text-xs text-muted-foreground">{cat.cityLabel}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomeSearch;