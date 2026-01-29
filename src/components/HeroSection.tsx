import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-parent-child.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[85vh] md:min-h-[80vh] flex items-center">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Rodzic z dzieckiem odkrywają świat razem"
          className="w-full h-full object-cover object-[center_15%]"
        />
        {/* Subtle gradient overlay for text readability (keep photo natural) */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/55 via-background/20 to-transparent md:from-background/45 md:via-background/15 md:to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container">
        <div className="max-w-xl md:max-w-lg lg:max-w-xl">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-soft">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl text-foreground">Razem</span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight text-balance animate-fade-in">
            Sprawdzone pomysły na wspólny czas z dzieckiem
          </h1>

          {/* Subheadline */}
          <p 
            className="mt-5 md:mt-6 text-lg md:text-xl text-muted-foreground animate-fade-in"
            style={{ animationDelay: "0.15s", opacity: 0 }}
          >
            Opinie rodziców takich jak Ty
          </p>

          {/* CTA Button */}
          <div 
            className="mt-8 md:mt-10 animate-fade-in"
            style={{ animationDelay: "0.3s", opacity: 0 }}
          >
            <Button variant="hero" size="xl" className="w-full sm:w-auto">
              <MapPin className="w-5 h-5" />
              Sprawdź atrakcje w pobliżu
            </Button>
          </div>

          {/* Trust indicator */}
          <div 
            className="mt-8 flex items-center gap-3 animate-fade-in"
            style={{ animationDelay: "0.45s", opacity: 0 }}
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
              +2500 rodziców korzysta z Razem
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
