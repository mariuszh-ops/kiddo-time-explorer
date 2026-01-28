import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import DecorativeBlobs from "@/components/DecorativeBlobs";

const Index = () => {
  return (
    <main className="relative min-h-screen flex flex-col gradient-hero">
      <DecorativeBlobs />
      
      {/* Header */}
      <header className="relative z-10 px-6 pt-6 md:pt-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Razem</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 flex-1 flex flex-col justify-center px-6 py-12 md:py-20">
        <div className="max-w-lg mx-auto md:max-w-2xl lg:max-w-3xl text-center md:text-left">
          {/* Headline */}
          <h1 
            className="font-serif text-4xl md:text-5xl lg:text-6xl text-foreground leading-tight text-balance animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            Sprawdzone pomysły na wspólny czas z dzieckiem
          </h1>
          
          {/* Subheadline */}
          <p 
            className="mt-5 md:mt-6 text-lg md:text-xl text-muted-foreground animate-fade-in"
            style={{ animationDelay: "0.25s", opacity: 0 }}
          >
            Opinie rodziców takich jak Ty
          </p>

          {/* CTA Button */}
          <div 
            className="mt-10 md:mt-12 animate-fade-in"
            style={{ animationDelay: "0.4s", opacity: 0 }}
          >
            <Button variant="hero" size="xl" className="w-full md:w-auto">
              <MapPin className="w-5 h-5" />
              Sprawdź atrakcje w pobliżu
            </Button>
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <footer 
        className="relative z-10 px-6 pb-8 md:pb-12 animate-fade-in"
        style={{ animationDelay: "0.55s", opacity: 0 }}
      >
        <div className="max-w-lg mx-auto md:max-w-2xl lg:max-w-3xl">
          <div className="flex items-center justify-center md:justify-start gap-6 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className="w-8 h-8 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-xs font-medium text-secondary-foreground"
                  >
                    {["A", "M", "K"][i - 1]}
                  </div>
                ))}
              </div>
              <span>+2500 rodziców</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;
