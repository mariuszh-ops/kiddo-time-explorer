import { useMemo } from "react";
import { Link } from "react-router-dom";
import ActivityCard from "@/components/ActivityCard";
import BlogCard from "@/components/BlogCard";
import HorizontalCarousel from "@/components/HorizontalCarousel";
import { Activity, getActivities, filterOptions } from "@/data/activities";
import { blogPosts } from "@/data/blogPosts";
import { FEATURES } from "@/lib/featureFlags";
import { REGIONS } from "@/data/regions";
import { useRegionCounts } from "@/hooks/useRegionCounts";
import { useTypeCounts } from "@/hooks/useTypeCounts";

interface DiscoverSectionsProps {
  activities: Activity[];
  onSelectCity?: (city: string) => void;
  onSelectCategory?: (type: string) => void;
}

// Kafelki 16 województw — źródło: src/data/regions.ts
const cityMeta = REGIONS.map((r) => ({
  value: r.slug,
  label: r.label,
  subtitle: r.subtitle,
  bg: r.bg,
  emoji: r.emoji,
}));

const SectionHeader = ({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) => (
  <div className="mb-5">
    <h2 className="text-xl font-serif text-foreground flex items-center gap-2">
      <span>{emoji}</span> {title}
    </h2>
    <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
  </div>
);

const pluralize = (n: number) => (n === 1 ? "atrakcja" : n < 5 && n > 0 ? "atrakcje" : "atrakcji");

const DiscoverSections = ({ activities }: DiscoverSectionsProps) => {
  const { counts: regionCounts } = useRegionCounts();
  const { counts: typeCounts } = useTypeCounts();

  const topRated = useMemo(() => {
    return activities
      .filter((a) => a.rating >= 4.7 && a.reviewCount >= 100)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);
  }, [activities]);

  const featuredActivities = useMemo(() => {
    return [...activities]
      .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
      .slice(0, 10);
  }, [activities]);

  return (
    <div className="bg-background">
      {/* Section 1: Featured places — raised above city tiles so real cards appear first */}
      {featuredActivities.length > 0 && (
        <section className="container py-6 md:py-8 border-b border-border/30">
          <SectionHeader emoji="🏆" title="Polecane miejsca" subtitle="Najlepiej oceniane atrakcje przez rodziców" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredActivities.map((activity) => (
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
          <div className="mt-6 text-center">
            <Link
              to={`/atrakcje/${REGIONS[0].slug}`}
              className="inline-flex items-center justify-center rounded-full border border-border bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              Zobacz wszystkie atrakcje
            </Link>
          </div>
        </section>
      )}

      {/* Section 2: Discover by City */}
      {(() => {
        const visibleCities = cityMeta.filter(c => FEATURES.ENABLED_CITIES.includes(c.value));
        if (visibleCities.length <= 1) return null;
        return (
          <section className="container py-6 md:py-8 border-b border-border/30">
            <SectionHeader emoji="🗺️" title="Odkrywaj po województwach" subtitle="Znajdź atrakcje blisko Ciebie" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
              {visibleCities.map((city) => {
                const count = regionCounts[city.value] ?? 0;
                const dim = count === 0;
                return (
                  <Link
                    key={city.value}
                    to={`/${city.value}`}
                    aria-label={`${city.label} — ${count} ${pluralize(count)}`}
                    className={`group relative overflow-hidden rounded-xl border border-border p-5 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${dim ? "opacity-60" : ""}`}
                    style={{ backgroundColor: city.bg }}
                  >
                    <span className="text-3xl mb-2 block">{city.emoji}</span>
                    <h3 className="font-semibold text-gray-800">{city.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {city.subtitle} · {count} {pluralize(count)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Section 3: Top Rated */}
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

      {/* Section 4: Category tiles */}
      <section className="container py-6 md:py-8 border-b border-border/30">
        <SectionHeader emoji="🔍" title="Szukasz czegoś konkretnego?" subtitle="Przeglądaj atrakcje według kategorii" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3 md:gap-4">
          {filterOptions.type.map((opt) => {
            const count = typeCounts[opt.value] ?? 0;
            const dim = count === 0;
            return (
              <Link
                key={opt.value}
                to={`/kategoria/${opt.value}`}
                aria-label={`${opt.label} — ${count} ${pluralize(count)}`}
                className={`group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-5 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${dim ? "opacity-60" : ""}`}
              >
                <h3 className="font-semibold text-gray-800 text-sm">{opt.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {count} {pluralize(count)}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Section 5: Blog */}
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
