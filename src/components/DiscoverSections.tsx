import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Star, Sparkles, MapPin, Clock } from "lucide-react";
import ActivityCard from "@/components/ActivityCard";
import BlogCard from "@/components/BlogCard";
import { Activity, mockActivities } from "@/data/activities";
import { blogPosts } from "@/data/blogPosts";
import { FEATURES } from "@/lib/featureFlags";
import { categoryConfigs, getCategoryCount } from "@/data/categoryPages";

interface DiscoverSectionsProps {
  activities: Activity[];
  onSelectCity: (city: string) => void;
}

const cityMeta: { value: string; label: string; gradient: string }[] = [
  { value: "warszawa", label: "Warszawa", gradient: "from-rose-500/10 to-orange-500/10" },
  { value: "krakow", label: "Kraków", gradient: "from-blue-500/10 to-indigo-500/10" },
  { value: "wroclaw", label: "Wrocław", gradient: "from-emerald-500/10 to-teal-500/10" },
  { value: "gdansk", label: "Gdańsk", gradient: "from-cyan-500/10 to-sky-500/10" },
  { value: "poznan", label: "Poznań", gradient: "from-amber-500/10 to-yellow-500/10" },
];

const SectionHeader = ({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) => (
  <div className="mb-5">
    <h2 className="text-xl font-serif text-foreground flex items-center gap-2">
      <span>{emoji}</span> {title}
    </h2>
    <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
  </div>
);

const DiscoverSections = ({ activities, onSelectCity }: DiscoverSectionsProps) => {
  const topRated = useMemo(() => {
    return activities
      .filter((a) => a.rating >= 4.7 && a.reviewCount >= 100)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);
  }, [activities]);

  const newlyAdded = useMemo(() => {
    return activities.filter((a) => a.reviewCount === 0).slice(0, 4);
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
      {/* Section 1: Top Rated */}
      {topRated.length > 0 && (
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

      {/* Section 2: Newly Added */}
      {newlyAdded.length > 0 && (
        <section className="container py-6 md:py-8 border-b border-border/30">
          <SectionHeader emoji="✨" title="Nowo dodane" subtitle="Bądź pierwszy, który oceni" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {newlyAdded.map((activity) => (
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

      {/* Blog section - only when BLOG feature enabled */}
      {FEATURES.BLOG && blogPosts.length > 0 && (
        <section className="container py-6 md:py-8 border-b border-border/30">
          <SectionHeader emoji="📝" title="Z naszego bloga" subtitle="Porady i inspiracje dla rodziców" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            {blogPosts.slice(0, 3).map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* Section: Category tiles — "Szukasz czegoś konkretnego?" */}
      <section className="container py-6 md:py-8 border-b border-border/30">
        <SectionHeader emoji="🔍" title="Szukasz czegoś konkretnego?" subtitle="Przeglądaj atrakcje według kategorii" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
          {categoryConfigs
            .filter(c => c.slug !== "") // skip the city main page
            .map((cat) => {
              const primaryCity = FEATURES.ENABLED_CITIES[0] || "warszawa";
              const allEnabled = mockActivities.filter(a => FEATURES.ENABLED_CITIES.includes(a.city) && (!a.isEvent || FEATURES.EVENTS));
              const count = getCategoryCount(allEnabled, primaryCity, cat);
              const href = `/atrakcje/${primaryCity}/${cat.slug}`;
              return (
                <Link
                  key={cat.slug}
                  to={href}
                  className="group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 p-5 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="text-xl mb-2 block">{cat.emoji}</span>
                  <h3 className="font-semibold text-foreground text-sm">{cat.label}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{count} atrakcji</p>
                </Link>
              );
            })}
        </div>
      </section>

      {/* Section 3: Discover by City — only when multiple cities enabled */}
      {(() => {
        const visibleCities = cityMeta.filter(c => FEATURES.ENABLED_CITIES.includes(c.value));
        if (visibleCities.length <= 1) return null;
        return (
          <section className="container py-6 md:py-8">
            <SectionHeader emoji="🗺️" title="Odkrywaj po miastach" subtitle="Znajdź atrakcje blisko Ciebie" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
              {visibleCities.map((city) => {
                const count = cityCounts[city.value] || 0;
                return (
                  <button
                    key={city.value}
                    onClick={() => onSelectCity(city.value)}
                    className={`group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br ${city.gradient} p-5 text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`}
                  >
                    <MapPin className="w-5 h-5 text-muted-foreground mb-2 group-hover:text-primary transition-colors" />
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
    </div>
  );
};

export default DiscoverSections;
