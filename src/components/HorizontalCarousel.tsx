import { useRef, useState, useEffect, useCallback, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalCarouselProps {
  children: ReactNode[];
  /** Number of visible cards per breakpoint: [mobile, sm, lg] */
  visibleCards?: [number, number, number];
}

const HorizontalCarousel = ({
  children,
  visibleCards = [1.5, 2.5, 4],
}: HorizontalCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, children.length]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardEl = el.querySelector<HTMLElement>(":scope > *");
    const cardWidth = cardEl?.offsetWidth || 300;
    el.scrollBy({ left: direction === "left" ? -cardWidth : cardWidth, behavior: "smooth" });
  };

  // Build responsive width classes from visibleCards
  // gap is 1rem (16px). Formula: (100% - (n-1)*gap) / n
  const [mobile, sm, lg] = visibleCards;
  const gapCount = (n: number) => (n - 1).toFixed(1);
  const mobileW = `calc((100% - ${gapCount(mobile)} * 1rem) / ${mobile})`;
  const smW = `calc((100% - ${gapCount(sm)} * 1rem) / ${sm})`;
  const lgW = `calc((100% - ${gapCount(lg)} * 1rem) / ${lg})`;

  if (children.length === 0) return null;

  return (
    <div className="relative group">
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 w-10 h-10 rounded-full bg-white border border-border shadow-md items-center justify-center hover:bg-muted transition-colors hidden md:flex"
          aria-label="Przewiń w lewo"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 w-10 h-10 rounded-full bg-white border border-border shadow-md items-center justify-center hover:bg-muted transition-colors hidden md:flex"
          aria-label="Przewiń w prawo"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mb-2"
      >
        {children.map((child, i) => (
          <div
            key={i}
            className="flex-shrink-0 snap-start"
            style={{
              width: mobileW,
            }}
          >
            {/* Responsive overrides via CSS custom properties won't work cleanly here,
                so we use a style tag approach with media queries per instance.
                Instead, use inline styles with a simpler approach: */}
            <style>{`
              .carousel-item-${i} { width: ${mobileW}; }
              @media (min-width: 640px) { .carousel-item-${i} { width: ${smW}; } }
              @media (min-width: 1024px) { .carousel-item-${i} { width: ${lgW}; } }
            `}</style>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HorizontalCarousel;
