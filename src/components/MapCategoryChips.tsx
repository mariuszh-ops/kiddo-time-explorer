import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "sala-zabaw", label: "Sala zabaw", emoji: "🎪" },
  { key: "plac-zabaw", label: "Plac zabaw", emoji: "🛝" },
  { key: "park-rozrywki", label: "Park rozrywki", emoji: "🎢" },
  { key: "muzeum-teatr", label: "Muzeum / Teatr", emoji: "🎭" },
  { key: "sport", label: "Sport", emoji: "⚽" },
  { key: "zoo", label: "Zoo", emoji: "🦁" },
  { key: "inne", label: "Inne", emoji: "📌" },
] as const;

interface MapCategoryChipsProps {
  selected: Set<string>;
  onToggle: (category: string) => void;
}

export default function MapCategoryChips({ selected, onToggle }: MapCategoryChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
      {CATEGORIES.map(({ key, label, emoji }) => {
        const isActive = selected.has(key);
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={cn(
              "shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-background border border-border text-muted-foreground hover:bg-accent"
            )}
          >
            <span>{emoji}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
