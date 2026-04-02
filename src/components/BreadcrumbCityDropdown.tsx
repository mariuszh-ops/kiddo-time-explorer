import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { getActivities } from "@/data/activities";
import { cityLabels } from "@/data/categoryPages";
import { FEATURES } from "@/lib/featureFlags";

interface Props {
  currentCitySlug: string;
}

const BreadcrumbCityDropdown = ({ currentCitySlug }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cityCounts = useMemo(() => {
    const all = getActivities().filter(a => FEATURES.EVENTS || !a.isEvent);
    const counts: Record<string, number> = {};
    for (const slug of FEATURES.ENABLED_CITIES) {
      counts[slug] = all.filter(a => a.city === slug).length;
    }
    return counts;
  }, []);

  const currentLabel = cityLabels[currentCitySlug]?.nominative ?? currentCitySlug;

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-normal text-foreground transition-all duration-150 hover:bg-[#F3F7F2] hover:underline cursor-pointer"
      >
        {currentLabel}
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 z-50 min-w-[240px] bg-white py-1"
          style={{
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(31,42,36,0.1)",
          }}
        >
          {FEATURES.ENABLED_CITIES.map(slug => {
            const label = cityLabels[slug]?.nominative ?? slug;
            const count = cityCounts[slug] ?? 0;
            const isActive = slug === currentCitySlug;
            const isDimmed = count === 0;

            return (
              <Link
                key={slug}
                to={`/atrakcje/${slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-[#F3F7F2]"
                style={{
                  color: isActive ? "#2F6B4F" : undefined,
                  fontWeight: isActive ? 600 : 400,
                  opacity: isDimmed && !isActive ? 0.5 : 1,
                }}
              >
                <span>{label}</span>
                <span className="text-muted-foreground text-xs ml-3">({count})</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BreadcrumbCityDropdown;
