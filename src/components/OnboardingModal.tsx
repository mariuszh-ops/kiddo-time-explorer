import { useState } from "react";
import { motion } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Compass, X, MapPin, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/lib/featureFlags";
import { REGIONS } from "@/data/regions";
import { cn } from "@/lib/utils";
import { setRawItem, STORAGE_KEYS } from "@/lib/storage";

interface OnboardingModalProps {
  onComplete: (selectedCity?: string) => void;
}

// 16 województw — źródło: src/data/regions.ts
const allCities = REGIONS.map((r) => ({
  value: r.slug,
  label: `${r.label} — ${r.subtitle}`,
  emoji: "📍",
}));

const OnboardingModal = ({ onComplete }: OnboardingModalProps) => {
  const enabledCities = FEATURES.ENABLED_CITIES;
  const [selectedCity, setSelectedCity] = useState<string>(enabledCities[0] || "warszawa");

  const handleStart = () => {
    setRawItem(STORAGE_KEYS.USER_CITY, selectedCity);
    onComplete(selectedCity);
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    // Radix Dialog daje focus-trap, Esc, aria-modal, powrót focusu i scroll-lock.
    // Modal jest montowany przez rodzica tylko gdy ma być widoczny → open zawsze true;
    // zamknięcie (Esc / przycisk X) leci przez onOpenChange do handleSkip.
    <DialogPrimitive.Root open onOpenChange={(o) => { if (!o) handleSkip(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[100] flex items-center justify-center focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0"
          // Content wypełnia ekran, więc „klik w tło" nie zamyka (spójne z poprzednim
          // zachowaniem — dismiss tylko przez X lub Esc).
        >
          {/* Skip button */}
          <DialogPrimitive.Close
            className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Pomiń"
          >
            <X className="w-5 h-5" />
          </DialogPrimitive.Close>

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
            <DialogPrimitive.Title asChild>
              <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">
                Witaj w FamilyFun!
              </h1>
            </DialogPrimitive.Title>
            <DialogPrimitive.Description asChild>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Sprawdzone atrakcje dla rodzin z dziećmi.
              </p>
            </DialogPrimitive.Description>

            {/* City label */}
            <p className="text-sm font-medium text-foreground mb-3 text-left">
              Wybierz swoje województwo:
            </p>

            {/* City tiles */}
            <div className="space-y-2 mb-8 max-h-[50vh] overflow-y-auto pr-1">
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default OnboardingModal;
