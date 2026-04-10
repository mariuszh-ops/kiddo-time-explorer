import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/lib/featureFlags";

interface HeroSectionProps {
  onExplore: () => void;
}

const HeroSection = ({ onExplore }: HeroSectionProps) => {
  return (
    <section className="md:container md:px-4 md:pt-4">
      <div className="relative min-h-[auto] py-12 md:py-0 md:min-h-[50vh] md:max-h-[55vh] flex items-center md:rounded-2xl overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 bg-[#8B7355]">
          <img
            src="/images/hero-parent-child.jpg"
            alt="Rodzic z dzieckiem odkrywają świat razem"
            decoding="async"
            fetchPriority="high"
            loading="eager"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            className="w-full h-full object-cover object-[75%_25%] md:object-[center_25%]"
          />
          {/* Gradient overlay - stronger bottom gradient on mobile for text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/80 md:bg-gradient-to-r md:from-background/60 md:via-background/15 md:to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 container md:px-8 lg:px-12">
          <div className="max-w-xl md:max-w-[45%] lg:max-w-xl lg:!max-w-[45%]">
            {/* Headline */}
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight text-balance animate-fade-in">
              {FEATURES.ENABLED_CITIES.length > 1
                ? "Sprawdzone pomysły na wspólny czas z dzieckiem"
                : "Sprawdzone pomysły na wspólny czas z dzieckiem w Warszawie"
              }
            </h1>

            {/* Subheadline */}
            <p 
              className="mt-5 md:mt-6 text-lg md:text-xl text-muted-foreground animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              Opinie rodziców takich jak Ty
            </p>

            {/* CTA Button */}
            <div 
              className="mt-8 md:mt-10 animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              <Button 
                variant="hero" 
                size="xl" 
                className="w-full sm:w-auto"
                onClick={onExplore}
              >
                <MapPin className="w-5 h-5" />
                {FEATURES.ENABLED_CITIES.length > 1 ? "Sprawdź atrakcje w pobliżu" : "Sprawdź atrakcje"}
              </Button>
            </div>

            {/* Trust indicator - hidden for MVP */}
            {false && (
            <div 
              className="mt-8 flex items-center gap-3 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-xs font-medium text-secondary-foreground"
                  >
                    {["A", "M", "K", "P"][i - 1]}
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                +2500 rodziców korzysta z FamilyFun
              </span>
            </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
