import { useMemo } from "react";
import { ChevronDown, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AMENITIES } from "@/data/amenities";

export const CATEGORY_TYPES: { value: string; label: string }[] = [
  { value: "sala-zabaw", label: "Sale zabaw" },
  { value: "plac-zabaw", label: "Place zabaw" },
  { value: "park-rozrywki", label: "Parki rozrywki" },
  { value: "centra-rozrywki", label: "Centra rozrywki" },
  { value: "muzeum-teatr", label: "Muzea i teatry" },
  { value: "sport", label: "Sport i ruch" },
  { value: "zoo", label: "Zoo i zwierzęta" },
  { value: "park", label: "Parki i natura" },
  { value: "inne", label: "Inne" },
];

export type SortOption = "rating" | "reviews" | "name";

/** Predefiniowane przedziały wieku dziecka. */
export const AGE_RANGES: { value: string; label: string; min: number; max: number }[] = [
  { value: "0-2", label: "0–2 lata", min: 0, max: 2 },
  { value: "3-5", label: "3–5 lat", min: 3, max: 5 },
  { value: "6-9", label: "6–9 lat", min: 6, max: 9 },
  { value: "10-13", label: "10–13 lat", min: 10, max: 13 },
  { value: "14-16", label: "14+", min: 14, max: 16 },
];

export interface CategoryFilterBarProps {
  type?: string;
  onTypeChange: (value: string | undefined) => void;
  typeLocked?: boolean; // when category is in route
  amenities: string[];
  onAmenitiesChange: (next: string[]) => void;
  minRating: number;
  onMinRatingChange: (value: number) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  onClearAll?: () => void;
  hasActiveFilters?: boolean;
  includeUncertain: boolean;
  onIncludeUncertainChange: (value: boolean) => void;
  /** Wybrany przedział wieku (value z AGE_RANGES) lub undefined. */
  age?: string;
  onAgeChange: (value: string | undefined) => void;
  /** Filtr „Tylko darmowe" (is_free=true). */
  onlyFree: boolean;
  onOnlyFreeChange: (value: boolean) => void;
}

const RATING_OPTIONS = [
  { value: 0, label: "Dowolna ocena" },
  { value: 3, label: "3.0+" },
  { value: 3.5, label: "3.5+" },
  { value: 4, label: "4.0+" },
  { value: 4.5, label: "4.5+" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "reviews", label: "Najpopularniejsze" },
  { value: "rating", label: "Najlepiej oceniane" },
  { value: "name", label: "Alfabetycznie" },
];

const CategoryFilterBar = ({
  type,
  onTypeChange,
  typeLocked,
  amenities,
  onAmenitiesChange,
  minRating,
  onMinRatingChange,
  sort,
  onSortChange,
  onClearAll,
  hasActiveFilters,
  includeUncertain,
  onIncludeUncertainChange,
  age,
  onAgeChange,
  onlyFree,
  onOnlyFreeChange,
}: CategoryFilterBarProps) => {
  const amenitiesLabel = useMemo(() => {
    if (amenities.length === 0) return "Udogodnienia";
    if (amenities.length === 1) {
      const a = AMENITIES.find((x) => x.id === amenities[0]);
      return a?.label ?? "Udogodnienia";
    }
    return `Udogodnienia (${amenities.length})`;
  }, [amenities]);

  const toggleAmenity = (id: string) => {
    if (amenities.includes(id)) {
      onAmenitiesChange(amenities.filter((x) => x !== id));
    } else {
      onAmenitiesChange([...amenities, id]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {/* Type */}
      {!typeLocked && (
        <Select
          value={type ?? "all"}
          onValueChange={(v) => onTypeChange(v === "all" ? undefined : v)}
        >
          <SelectTrigger
            className={cn(
              "h-9 w-auto min-w-[160px] rounded-full px-3 text-sm font-medium",
              type ? "bg-primary/10 text-primary border-primary" : "",
            )}
            aria-label="Kategoria atrakcji"
          >
            <SelectValue placeholder="Kategoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie kategorie</SelectItem>
            {CATEGORY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Amenities multi */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-sm font-medium transition-colors whitespace-nowrap",
              amenities.length > 0
                ? "bg-primary/10 text-primary border-primary"
                : "bg-background text-foreground border-border hover:bg-accent",
            )}
            aria-label="Udogodnienia"
          >
            <span>{amenitiesLabel}</span>
            {amenities.length > 0 ? (
              <X
                className="w-3.5 h-3.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onAmenitiesChange([]);
                }}
              />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3">
          <div className="max-h-80 overflow-y-auto space-y-1">
            {AMENITIES.map((a) => {
              const checked = amenities.includes(a.id);
              return (
                <label
                  key={a.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleAmenity(a.id)}
                    aria-label={a.label}
                  />
                  <span>{a.label}</span>
                </label>
              );
            })}
          </div>
          {amenities.length > 0 && (
            <div className="pt-2 mt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => onAmenitiesChange([])}
              >
                Wyczyść udogodnienia
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Min rating */}
      <Select
        value={String(minRating)}
        onValueChange={(v) => onMinRatingChange(Number(v))}
      >
        <SelectTrigger
          className={cn(
            "h-9 w-auto min-w-[140px] rounded-full px-3 text-sm font-medium",
            minRating > 0 ? "bg-primary/10 text-primary border-primary" : "",
          )}
          aria-label="Minimalna ocena"
        >
          <SelectValue placeholder="Ocena" />
        </SelectTrigger>
        <SelectContent>
          {RATING_OPTIONS.map((r) => (
            <SelectItem key={r.value} value={String(r.value)}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Wiek dziecka */}
      <Select
        value={age ?? "all"}
        onValueChange={(v) => onAgeChange(v === "all" ? undefined : v)}
      >
        <SelectTrigger
          className={cn(
            "h-9 w-auto min-w-[150px] rounded-full px-3 text-sm font-medium",
            age ? "bg-primary/10 text-primary border-primary" : "",
          )}
          aria-label="Wiek dziecka"
          title="Pokazujemy tylko atrakcje z potwierdzonym wiekiem."
        >
          <SelectValue placeholder="Wiek dziecka" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Każdy wiek</SelectItem>
          {AGE_RANGES.map((a) => (
            <SelectItem key={a.value} value={a.value}>
              {a.label}
            </SelectItem>
          ))}
          <div className="px-2 py-1.5 text-[11px] leading-snug text-muted-foreground border-t mt-1">
            Pokazujemy tylko atrakcje z potwierdzonym wiekiem.
          </div>
        </SelectContent>
      </Select>

      {/* Tylko darmowe */}
      <button
        type="button"
        onClick={() => onOnlyFreeChange(!onlyFree)}
        aria-pressed={onlyFree}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-sm font-medium transition-colors whitespace-nowrap",
          onlyFree
            ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
            : "bg-background text-foreground border-border hover:bg-accent",
        )}
        title="Pokaż tylko atrakcje bez biletu"
      >
        Tylko darmowe
      </button>

      {/* Sort / clear / auto-classified */}
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
        <div className="flex items-center gap-2 pr-2 border-r border-border/60 mr-1">
          <Switch
            id="toggle-auto-classified"
            checked={includeUncertain}
            onCheckedChange={onIncludeUncertainChange}
            aria-label="Pokaż atrakcje klasyfikowane automatycznie"
          />
          <Label
            htmlFor="toggle-auto-classified"
            className="text-xs font-medium text-muted-foreground cursor-pointer whitespace-nowrap"
            title="Wyłącz, aby ukryć atrakcje, których typ ustalił model AI."
          >
            Pokaż klasyfikowane automatycznie
          </Label>
        </div>
        {hasActiveFilters && onClearAll && (
          <Button variant="ghost" size="sm" onClick={onClearAll} className="h-9 rounded-full">
            Wyczyść filtry
          </Button>
        )}
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger
            className="h-9 w-auto min-w-[120px] max-w-[150px] sm:min-w-[180px] sm:max-w-none rounded-full px-3 text-sm font-medium truncate"
            aria-label="Sortowanie"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CategoryFilterBar;