import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { categoryConfigs, getCategoryCount } from "@/data/categoryPages";
import { getActivities, Activity } from "@/data/activities";
import { FEATURES } from "@/lib/featureFlags";

interface Props {
  citySlug: string;
  cityLabel: string;
  activeCategorySlug?: string;
}

const BreadcrumbCategoryDropdown = ({ citySlug, cityLabel, activeCategorySlug }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allActivities = useMemo(() => {
    return getActivities().filter(a => FEATURES.EVENTS || !a.isEvent);
  }, []);

  // Categories to show (skip the first "all" entry — it goes at the bottom as "Wszystkie kategorie")
  const allConfig = categoryConfigs[0]; // slug ""
  const subCategories = categoryConfigs.filter(c => c.slug !== "");

  const allCount = getCategoryCount(allActivities, citySlug, allConfig);

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 transition-colors hover:text-foreground cursor-pointer"
      >
        {cityLabel}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 z-50 min-w-[240px] bg-white py-1"
          style={{
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(31,42,36,0.1)",
          }}
        >
          {subCategories.map(cat => {
            const count = getCategoryCount(allActivities, citySlug, cat);
            const isActive = activeCategorySlug === cat.slug;
            const isDimmed = count === 0;

            return (
              <Link
                key={cat.slug}
                to={`/atrakcje/${citySlug}/${cat.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-2 text-sm transition-colors"
                style={{
                  color: isActive ? "#2F6B4F" : undefined,
                  fontWeight: isActive ? 600 : 400,
                  opacity: isDimmed ? 0.5 : 1,
                  backgroundColor: "transparent",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "#F3F7F2";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                <span>
                  {cat.emoji} {cat.label}
                </span>
                <span className="text-muted-foreground text-xs ml-3">({count})</span>
              </Link>
            );
          })}

          {/* Separator */}
          <div className="mx-3 my-1" style={{ height: "1px", backgroundColor: "#DCE6DA" }} />

          {/* All categories */}
          <Link
            to={`/atrakcje/${citySlug}`}
            onClick={() => setOpen(false)}
            className="flex items-center justify-between px-4 py-2 text-sm transition-colors"
            style={{
              color: !activeCategorySlug ? "#2F6B4F" : undefined,
              fontWeight: !activeCategorySlug ? 600 : 400,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "#F3F7F2";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            <span>📍 Wszystkie kategorie</span>
            <span className="text-muted-foreground text-xs ml-3">({allCount})</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default BreadcrumbCategoryDropdown;
