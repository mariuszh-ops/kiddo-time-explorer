import { useMemo } from "react";
import { Link } from "react-router-dom";
import { categoryConfigs, getCategoryCount } from "@/data/categoryPages";
import { getActivities } from "@/data/activities";
import { FEATURES } from "@/lib/featureFlags";

interface Props {
  citySlug: string;
  activeCategorySlug?: string;
}

const CategoryPills = ({ citySlug, activeCategorySlug }: Props) => {
  const allActivities = useMemo(() => {
    return getActivities().filter(a => FEATURES.EVENTS || !a.isEvent);
  }, []);

  const allConfig = categoryConfigs[0];
  const subCategories = categoryConfigs.filter(c => c.slug !== "");
  const allCount = getCategoryCount(allActivities, citySlug, allConfig);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      {/* "All" pill */}
      <Link
        to={`/atrakcje/${citySlug}`}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-150"
        style={
          !activeCategorySlug
            ? { background: "#DCEEDB", color: "#2F6B4F", border: "1px solid #2F6B4F", fontWeight: 600 }
            : { background: "#F3F7F2", color: "#5F6F66", border: "1px solid #DCE6DA", fontWeight: 400 }
        }
      >
        Wszystkie ({allCount})
      </Link>

      {subCategories.map(cat => {
        const count = getCategoryCount(allActivities, citySlug, cat);
        const isActive = activeCategorySlug === cat.slug;

        return (
          <Link
            key={cat.slug}
            to={`/atrakcje/${citySlug}/${cat.slug}`}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all duration-150"
            style={
              isActive
                ? { background: "#DCEEDB", color: "#2F6B4F", border: "1px solid #2F6B4F", fontWeight: 600 }
                : {
                    background: "#F3F7F2",
                    color: "#5F6F66",
                    border: "1px solid #DCE6DA",
                    fontWeight: 400,
                    opacity: count === 0 ? 0.5 : 1,
                  }
            }
          >
            {cat.emoji} {cat.label} ({count})
          </Link>
        );
      })}
    </div>
  );
};

export default CategoryPills;
