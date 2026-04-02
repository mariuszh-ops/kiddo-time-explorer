import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/lib/featureFlags";

interface HeroSectionProps {
  onExplore: () => void;
}

const HeroSection = ({ onExplore }: HeroSectionProps) => {
  return (
    <section className="md:container md:px-4 md:pt-4">
      <div className="relative min-h-[auto] py-12 md:py-0 md:min-h-[50vh] md:max-h-[55vh] flex items-end md:items-center md:rounded-[var(--radius-xl)] overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="/images/hero-parent-child.jpg"
            alt="Rodzic z dzieckiem odkrywają świat razem"
            decoding="async"
            fetchPriority="high"
            loading="eager"
            className="w-full h-full object-cover object-[75%_25%] md:object-[center_25%]"
          />
          {/* Cinematic gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, rgba(31,42,36,0.15) 0%, rgba(31,42,36,0.45) 50%, rgba(31,42,36,0.75) 100%)`,
            }}
          />
        </div>

        {/* Content */}
        <div
          className="relative z-10 container"
          style={{ padding: `var(--space-8) var(--space-8) var(--space-12)` }}
        >
          <div className="max-w-xl md:max-w-[45%] lg:max-w-xl lg:!max-w-[45%]" style={{ maxWidth: '600px' }}>
            {/* Headline */}
            <h1
              className="font-serif text-4xl md:text-5xl lg:text-6xl leading-tight text-balance animate-fade-in"
              style={{
                font: 'var(--text-display)',
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                color: 'var(--color-text-inverse)',
                letterSpacing: '-0.02em',
                textShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }}
            >
              {FEATURES.ENABLED_CITIES.length > 1
                ? "Sprawdzone pomysły na wspólny czas z dzieckiem"
                : "Sprawdzone pomysły na wspólny czas z dzieckiem w Warszawie"
              }
            </h1>

            {/* Subheadline */}
            <p
              className="animate-fade-in"
              style={{
                marginTop: 'var(--space-3)',
                font: 'var(--text-body)',
                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                color: 'rgba(255,255,255,0.85)',
                textShadow: '0 1px 6px rgba(0,0,0,0.2)',
                animationDelay: '0.1s',
              }}
            >
              Opinie rodziców takich jak Ty
            </p>

            {/* CTA Button */}
            <div
              className="animate-fade-in"
              style={{
                marginTop: 'var(--space-6)',
                animationDelay: '0.2s',
              }}
            >
              <Button
                variant="hero"
                size="xl"
                className="w-full sm:w-auto"
                style={{
                  padding: 'var(--space-4) var(--space-8)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-md)',
                }}
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
