import { useMemo } from "react";
import { Link } from "react-router-dom";
import ActivityCard from "@/components/ActivityCard";
import BlogCard from "@/components/BlogCard";
import HorizontalCarousel from "@/components/HorizontalCarousel";
import { Activity, getActivities, filterOptions } from "@/data/activities";
import { blogPosts } from "@/data/blogPosts";
import { FEATURES } from "@/lib/featureFlags";

interface DiscoverSectionsProps {
  activities: Activity[];
  onSelectCity: (city: string) => void;
  onSelectCategory?: (type: string) => void;
}

const cityMeta: { value: string; label: string; bg: string; emoji: string }[] = [
  { value: "warszawa", label: "Warszawa i okolice", bg: "#E8F0E4", emoji: "🧜‍♀️" },
  { value: "slask", label: "Aglomeracja Śląska", bg: "#E8F0E4", emoji: "⛏️" },
  { value: "krakow", label: "Kraków i okolice", bg: "#DFF0EC", emoji: "🐉" },
  { value: "wroclaw", label: "Wrocław i okolice", bg: "#E4EEF5", emoji: "🤴" },
  { value: "trojmiasto", label: "Trójmiasto", bg: "#F2EBDD", emoji: "⚓" },
  { value: "poznan", label: "Poznań i okolice", bg: "#E6EDDF", emoji: "🐐" },
  { value: "lodz", label: "Łódź i okolice", bg: "#DFF0EC", emoji: "🎬" },
];

const SectionHeader = ({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) => (
  <div className="mb-5">
    <h2 className="text-xl font-serif text-foreground flex items-center gap-2">
      <span>{emoji}</span> {title}
    </h2>
    <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
  </div>
);

const DiscoverSections = ({ activities, onSelectCity, onSelectCategory }: DiscoverSectionsProps) => {
  const topRated = useMemo(() => {
    return activities
      .filter((a) => a.rating >= 4.7 && a.reviewCount >= 100)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);
  }, [activities]);

  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of activities) {
      counts[a.city] = (counts[a.city] || 0) + 1;
    }
    return counts;
  }, [activities]);

  return (
    <div className="bg-background">
      {/* Section 1: Discover by City */}
      {(() => {
        const visibleCities = cityMeta.filter(c => ["warszawa", "krakow", "wroclaw", "slask", "poznan"].includes(c.value) && FEATURES.ENABLED_CITIES.includes(c.value));
        if (visibleCities.length <= 1) return null;
        return (
          <section className="container py-6 md:py-8 border-b border-border/30">
            <SectionHeader emoji="🗺️" title="Odkrywaj po miastach" subtitle="Znajdź atrakcje blisko Ciebie" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {visibleCities.map((city) => {
                const count = cityCounts[city.value] || 0;
                const isEmpty = count === 0;
                return isEmpty ? (
                  <div
                    key={city.value}
                    className="relative overflow-hidden rounded-xl border border-border p-5 text-left opacity-50 cursor-default"
                    style={{ backgroundColor: city.bg }}
                  >
                    <span className="text-3xl mb-2 block">{city.emoji}</span>
                    <h3 className="font-semibold text-foreground">{city.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Wkrótce</p>
                  </div>
                ) : (
                  <button
                    key={city.value}
                    onClick={() => onSelectCity(city.value)}
                    className="group relative overflow-hidden rounded-xl border border-border p-5 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                    style={{ backgroundColor: city.bg }}
                  >
                    <span className="text-3xl mb-2 block">{city.emoji}</span>
                    <h3 className="font-semibold text-foreground">{city.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {count} {count === 1 ? "atrakcja" : count < 5 ? "atrakcje" : "atrakcji"}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Section 2: Top Rated */}
      {FEATURES.TOP_RATED_SECTION && topRated.length > 0 && (
        <section className="container py-6 md:py-8 border-b border-border/30">
          <SectionHeader emoji="⭐" title="Najlepiej oceniane" subtitle="Sprawdzone przez rodziców" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {topRated.map((activity) => (
              <ActivityCard
                key={activity.id}
                id={activity.id}
                title={activity.title}
                location={activity.location}
                rating={activity.rating}
                reviewCount={activity.reviewCount}
                ageRange={activity.ageRange}
                matchPercentage={activity.matchPercentage}
                imageUrl={activity.imageUrl}
                tags={activity.tags}
                type={activity.type}
                isEvent={FEATURES.EVENTS ? activity.isEvent : false}
                eventDate={activity.eventDate}
                slug={activity.slug}
                amenities={activity.amenities}
                priceLevel={activity.priceLevel}
                isRecommended={activity.isRecommended}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Category tiles */}
      <section className="container py-6 md:py-8 border-b border-border/30">
        <SectionHeader emoji="🔍" title="Szukasz czegoś konkretnego?" subtitle="Przeglądaj atrakcje według kategorii" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3 md:gap-4">
          {filterOptions.type.map((opt) => {
            const allEnabled = getActivities().filter(a => FEATURES.ENABLED_CITIES.includes(a.city) && (!a.isEvent || FEATURES.EVENTS));
            const count = allEnabled.filter(a => a.type === opt.value).length;
            return (
              <button
                key={opt.value}
                onClick={count > 0 ? () => onSelectCategory?.(opt.value) : undefined}
                disabled={count === 0}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-5 text-left transition-all",
                  count > 0
                    ? "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                    : "opacity-50 cursor-default"
                )}
              >
                <h3 className="font-semibold text-foreground text-sm">{opt.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {count > 0 ? `${count} atrakcji` : "Wkrótce"}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 4: Blog */}
      {FEATURES.BLOG && blogPosts.length > 0 && (
        <section className="container py-6 md:py-8 border-b border-border/30">
          <SectionHeader emoji="📝" title="Z naszego bloga" subtitle="Porady i inspiracje dla rodziców" />
          <HorizontalCarousel visibleCards={[1.5, 2.5, 3]}>
            {blogPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </HorizontalCarousel>
        </section>
      )}
    </div>
  );
};

export default DiscoverSections;
