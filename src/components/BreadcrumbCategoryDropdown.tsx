import { useState, useRef, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { getActivities, FILTER_OPTIONS } from "@/data/activities";
import { FEATURES } from "@/lib/featureFlags";

interface Props {
  citySlug: string;
  activeCategorySlug?: string;
  currentLabel: string;
}

const BreadcrumbCategoryDropdown = ({ citySlug, activeCategorySlug, currentLabel }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cityActivities = useMemo(() => {
    return getActivities()
      .filter(a => FEATURES.EVENTS || !a.isEvent)
      .filter(a => a.city === citySlug);
  }, [citySlug]);

  const typeOptions = FILTER_OPTIONS.type;
  const allCount = cityActivities.length;

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
          className="absolute top-full left-0 mt-2 z-50 min-w-[220px] bg-white py-1"
          style={{
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(31,42,36,0.1)",
          }}
        >
          {/* All */}
          <Link
            to={`/atrakcje/${citySlug}`}
            onClick={() => setOpen(false)}
            className="flex items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-[#F3F7F2]"
            style={{
              color: !activeCategorySlug ? "#2F6B4F" : undefined,
              fontWeight: !activeCategorySlug ? 600 : 400,
            }}
          >
            <span>Wszystkie</span>
            <span className="text-muted-foreground text-xs ml-3">({allCount})</span>
          </Link>

          {/* Separator */}
          <div className="mx-3 my-1" style={{ height: "1px", backgroundColor: "#DCE6DA" }} />

          {typeOptions.map(opt => {
            const count = cityActivities.filter(a => a.type === opt.value).length;
            const isActive = activeCategorySlug === opt.value;

            return (
              <Link
                key={opt.value}
                to={`/atrakcje/${citySlug}/${opt.value}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-4 py-2 text-sm transition-colors hover:bg-[#F3F7F2]"
                style={{
                  color: isActive ? "#2F6B4F" : undefined,
                  fontWeight: isActive ? 600 : 400,
                  opacity: count === 0 ? 0.5 : 1,
                }}
              >
                <span>{opt.label}</span>
                <span className="text-muted-foreground text-xs ml-3">({count})</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BreadcrumbCategoryDropdown;
