import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";

export const FAVORITES_CHIP_KEY = "_favorites";

const CATEGORIES = [
  { key: FAVORITES_CHIP_KEY, label: "Ulubione", emoji: "❤️" },
  { key: "plac-zabaw", label: "Plac zabaw", emoji: "🛝" },
  { key: "sport", label: "Sport", emoji: "⚽" },
  { key: "warsztaty", label: "Warsztaty", emoji: "🎨" },
  { key: "zoo", label: "Zoo", emoji: "🦁" },
  { key: "muzeum", label: "Muzeum", emoji: "🎭" },
  { key: "park", label: "Park", emoji: "🌳" },
  { key: "inne", label: "Inne", emoji: "📌" },
] as const;

interface MapCategoryChipsProps {
  selected: Set<string>;
  onToggle: (category: string) => void;
}

export default function MapCategoryChips({ selected, onToggle }: MapCategoryChipsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* Left fade + chevron (desktop only) */}
      {canScrollLeft && (
        <>
          <div className="hidden md:block absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-background to-transparent z-[1] pointer-events-none" />
          <button
            onClick={() => scroll(-1)}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-[2] items-center justify-center w-8 h-8 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
            aria-label="Przewiń w lewo"
          >
            <ChevronLeft size={16} />
          </button>
        </>
      )}

      {/* Right fade + chevron (desktop only) */}
      {canScrollRight && (
        <>
          <div className="hidden md:block absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent z-[1] pointer-events-none" />
          <button
            onClick={() => scroll(1)}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-[2] items-center justify-center w-8 h-8 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors"
            aria-label="Przewiń w prawo"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

      <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
      {CATEGORIES.map(({ key, label, emoji }) => {
        const isActive = selected.has(key);
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            className={cn(
              "shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
              isActive
                ? key === FAVORITES_CHIP_KEY
                  ? "bg-red-500 text-white"
                  : "bg-primary text-primary-foreground"
                : "bg-background border border-border text-muted-foreground hover:bg-accent"
            )}
          >
            <span>{emoji}</span>
            {label}
          </button>
        );
      })}
      </div>
    </div>
  );
}
