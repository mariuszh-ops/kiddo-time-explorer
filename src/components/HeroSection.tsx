import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/lib/featureFlags";
import { getActivities } from "@/data/activities";

interface HeroSectionProps {
  onExplore: () => void;
}

const HeroSection = ({ onExplore }: HeroSectionProps) => {
  const totalCount = getActivities().filter(
    (a) => FEATURES.ENABLED_CITIES.includes(a.city)
  ).length;
  const roundedCount = Math.floor(totalCount / 50) * 50;
  const displayCount = roundedCount >= 50 ? `${roundedCount}+` : totalCount;

  return (
    <section className="md:container md:px-4 md:pt-4">
      <div
        className="relative flex items-center md:rounded-2xl overflow-hidden py-5 [@media(min-height:700px)]:py-7 [@media(min-height:800px)]:py-10 md:py-0 md:min-h-[50vh] md:max-h-[55vh] min-h-[280px]"
        style={{
          // Cap mobile hero height so activity cards peek above the fold.
          // Uses 60svh instead of 100svh to leave room for HomeSearch + featured cards.
          maxHeight:
            'calc(60svh - var(--header-h, 72px) - var(--bottom-nav-h, 64px) - 16px)',
        }}
      >
        {/* Background image */}
        <div className="absolute inset-0 bg-[#8B7355]">
          <img
            src="/images/hero-parent-child-1280.webp"
            srcSet="/images/hero-parent-child-640.webp 640w, /images/hero-parent-child-1280.webp 1280w, /images/hero-parent-child-1920.webp 1920w"
            sizes="100vw"
            width={1280}
            height={853}
            alt="Rodzic z dzieckiem odkrywają świat razem"
            decoding="async"
            fetchPriority="high"
            loading="eager"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            className="w-full h-full object-cover object-[center_30%] md:object-[center_30%]"
          />
          {/* Gradient overlay - stronger bottom gradient on mobile for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/80 md:bg-gradient-to-r md:from-background/60 md:via-background/15 md:to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 container px-5 sm:px-6 md:px-8 lg:px-12">
          <div className="max-w-xl md:max-w-[45%] lg:max-w-xl lg:!max-w-[45%]">
            {/* Headline */}
            <h1 className="font-serif text-[22px] [@media(min-height:700px)]:text-[26px] leading-[1.15] xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl md:leading-tight text-foreground text-balance animate-fade-in">
              {FEATURES.ENABLED_CITIES.length > 1
                ? "Sprawdzone pomysły na wspólny czas z dzieckiem"
                : "Sprawdzone pomysły na wspólny czas z dzieckiem w Warszawie"
              }
            </h1>

            {/* Subheadline */}
            <p 
              className="mt-2 [@media(min-height:700px)]:mt-3 sm:mt-5 md:mt-6 text-sm [@media(min-height:700px)]:text-base sm:text-lg md:text-xl text-muted-foreground animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              Opinie rodziców takich jak Ty
            </p>

            {totalCount > 0 && (
              <p
                className="mt-1 [@media(min-height:700px)]:mt-1.5 sm:mt-2 text-xs [@media(min-height:700px)]:text-sm md:text-base text-muted-foreground animate-fade-in"
                style={{ animationDelay: "0.15s" }}
              >
                {displayCount} atrakcji z ocenami Google
              </p>
            )}

            {/* CTA Button */}
            <div 
              className="mt-4 [@media(min-height:700px)]:mt-5 sm:mt-8 md:mt-10 animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              <Button 
                variant="hero" 
                size="xl" 
                className="w-full sm:w-auto shadow-lg h-12 [@media(min-height:700px)]:h-14 text-base [@media(min-height:700px)]:text-lg"
                onClick={onExplore}
              >
                <MapPin className="w-5 h-5" />
                Przeglądaj atrakcje
              </Button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
