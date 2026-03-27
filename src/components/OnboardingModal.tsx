import { useState } from "react";
import { motion } from "framer-motion";
import { Compass, X, MapPin, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";

interface OnboardingModalProps {
  onComplete: (selectedCity?: string) => void;
}

const allCities = [
  { value: "warszawa", label: "Warszawa", emoji: "📍" },
  { value: "krakow", label: "Kraków", emoji: "📍" },
  { value: "wroclaw", label: "Wrocław", emoji: "📍" },
  { value: "gdansk", label: "Gdańsk", emoji: "📍" },
  { value: "poznan", label: "Poznań", emoji: "📍" },
];

const OnboardingModal = ({ onComplete }: OnboardingModalProps) => {
  const enabledCities = FEATURES.ENABLED_CITIES;
  const [selectedCity, setSelectedCity] = useState<string>(enabledCities[0] || "warszawa");

  const handleStart = () => {
    localStorage.setItem("ff_user_city", selectedCity);
    onComplete(selectedCity);
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-sm flex items-center justify-center"
    >
      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Pomiń"
      >
        <X className="w-5 h-5" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="w-full max-w-[400px] mx-auto px-6 text-center"
      >
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Compass className="w-10 h-10 text-primary" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">
          Witaj w FamilyFun!
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          Sprawdzone atrakcje dla rodzin z dziećmi.
        </p>

        {/* City label */}
        <p className="text-sm font-medium text-foreground mb-3 text-left">
          Wybierz swoje miasto:
        </p>

        {/* City tiles */}
        <div className="space-y-2 mb-8">
          {allCities.map((city) => {
            const isEnabled = enabledCities.includes(city.value);
            const isSelected = selectedCity === city.value;

            return (
              <button
                key={city.value}
                disabled={!isEnabled}
                onClick={() => isEnabled && setSelectedCity(city.value)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                  isEnabled && isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : isEnabled
                    ? "border-border bg-card hover:bg-accent/50 cursor-pointer"
                    : "border-border bg-muted/30 opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-lg flex-shrink-0">
                  {isEnabled ? (
                    <MapPin className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                </span>
                <span className={cn(
                  "text-sm font-medium flex-1",
                  isEnabled ? "text-foreground" : "text-muted-foreground"
                )}>
                  {city.label}
                </span>
                {!isEnabled && (
                  <span className="text-xs text-muted-foreground">wkrótce</span>
                )}
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <Button onClick={handleStart} className="w-full" size="lg">
          Zaczynajmy →
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default OnboardingModal;
