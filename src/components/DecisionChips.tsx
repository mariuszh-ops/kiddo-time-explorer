import { Filters } from "@/hooks/useActivityFilters";
import { cn } from "@/lib/utils";

interface DecisionChipsProps {
  filters: Filters;
  onUpdateFilter: (key: keyof Filters, value: string | undefined) => void;
}

const CHIPS = [
  { label: "Na deszcz", emoji: "🌧️", filterKey: "indoor" as keyof Filters, value: "indoor" },
  { label: "Za darmo", emoji: "💸", filterKey: "price" as keyof Filters, value: "free" },
  { label: "Na zewnątrz", emoji: "🌳", filterKey: "indoor" as keyof Filters, value: "outdoor" },
  { label: "Dla maluchów", emoji: "👶", filterKey: "age" as keyof Filters, value: "0-2" },
  { label: "Place zabaw", emoji: "🎪", filterKey: "type" as keyof Filters, value: "plac-zabaw" },
  { label: "Muzea", emoji: "🎨", filterKey: "type" as keyof Filters, value: "muzeum" },
  { label: "Sport i ruch", emoji: "⚽", filterKey: "type" as keyof Filters, value: "sport" },
] as const;

const DecisionChips = ({ filters, onUpdateFilter }: DecisionChipsProps) => {
  return (
    <div className="container py-3">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide sm:flex-wrap">
        {CHIPS.map((chip) => {
          const isActive = filters[chip.filterKey] === chip.value;
          return (
            <button
              key={`${chip.filterKey}-${chip.value}`}
              onClick={() =>
                onUpdateFilter(chip.filterKey, isActive ? undefined : chip.value)
              }
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap shrink-0",
                "transition-all duration-150 ease-in-out",
                isActive
                  ? "bg-primary text-primary-foreground border border-primary font-semibold"
                  : "bg-secondary text-foreground border border-border hover:bg-muted"
              )}
            >
              <span>{chip.emoji}</span>
              <span>{chip.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DecisionChips;
