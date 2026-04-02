import { Users } from "lucide-react";
import { Filters } from "@/hooks/useActivityFilters";
import { filterOptions } from "@/data/activities";

interface SocialProofBannerProps {
  filters: Filters;
  resultCount: number;
}

const CITY_DISPLAY_NAMES: Record<string, string> = {
  warszawa: "Warszawie",
  krakow: "Krakowie",
  wroclaw: "Wrocławiu",
  gdansk: "Gdańsku",
  poznan: "Poznaniu",
};

const SocialProofBanner = ({ filters, resultCount }: SocialProofBannerProps) => {
  // Only show if city is selected AND (age OR type is selected)
  const hasCity = Boolean(filters.city);
  const hasAge = Boolean(filters.age);
  const hasType = Boolean(filters.type);
  
  if (!hasCity || (!hasAge && !hasType)) {
    return null;
  }

  if (resultCount === 0) {
    return null;
  }

  const cityName = filters.city ? CITY_DISPLAY_NAMES[filters.city] || filters.city : "";
  
  // Get age range label
  const ageOption = filters.age 
    ? filterOptions.age.find(o => o.value === filters.age)
    : null;
  const ageLabel = ageOption?.label || "";

  // Get type label
  const typeOption = filters.type?.length === 1
    ? filterOptions.type.find(o => o.value === filters.type![0])
    : null;
  const typeLabel = typeOption?.label?.toLowerCase() || "";

  // Build contextual copy
  let copy = "";
  
  if (hasAge && hasType) {
    // City + Age + Type
    copy = `Popularne wśród rodziców dzieci ${ageLabel} w ${cityName}`;
  } else if (hasAge) {
    // City + Age only
    copy = `Popularne wśród rodziców dzieci ${ageLabel} w ${cityName}`;
  } else if (hasType) {
    // City + Type only
    const typeContext = filters.indoor === "indoor" 
      ? "aktywności w pomieszczeniach" 
      : filters.indoor === "outdoor" 
        ? "aktywności na zewnątrz"
        : typeLabel;
    copy = `Często wybierane przez rodziny z ${cityName.replace(/ie$/, 'a').replace(/u$/, 'a')} szukające: ${typeContext}`;
  }

  if (!copy) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <Users className="w-4 h-4 text-primary/60" />
      <span>{copy}</span>
    </div>
  );
};

export default SocialProofBanner;
