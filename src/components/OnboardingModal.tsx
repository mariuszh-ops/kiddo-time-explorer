import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Star, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURES } from "@/lib/featureFlags";

interface OnboardingModalProps {
  onComplete: () => void;
}

const steps = [
  {
    id: "welcome",
    title: "Witaj w FamilyFun!",
    subtitle: FEATURES.ENABLED_CITIES.length > 1
      ? "Sprawdzone atrakcje dla rodzin z dziećmi w Polsce"
      : "Sprawdzone atrakcje dla rodzin z dziećmi w Warszawie",
    icon: Compass,
    cta: "Dalej",
  },
  {
    id: "how",
    title: "Jak to działa?",
    subtitle: "Trzy proste kroki do idealnego wyjścia z dzieckiem",
    features: [
      { icon: Compass, label: "Przeglądaj atrakcje" },
      { icon: Star, label: "Czytaj opinie rodziców" },
      { icon: Heart, label: "Zapisuj ulubione" },
    ],
    cta: "Zaczynajmy!",
  },
];

const OnboardingModal = ({ onComplete }: OnboardingModalProps) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const next = () => {
    if (isLast) {
      onComplete();
    } else {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/98 backdrop-blur-sm flex items-center justify-center"
    >
      {/* Skip */}
      <button
        onClick={onComplete}
        className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Pomiń"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="w-full max-w-sm mx-auto px-6 text-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {/* Welcome step */}
            {current.id === "welcome" && (
              <div>
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <current.icon className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-2xl font-serif font-semibold text-foreground mb-3">
                  {current.title}
                </h1>
                <p className="text-muted-foreground leading-relaxed">
                  {current.subtitle}
                </p>
              </div>
            )}

            {/* How it works step */}
            {current.id === "how" && current.features && (
              <div>
                <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
                  {current.title}
                </h2>
                <p className="text-sm text-muted-foreground mb-8">{current.subtitle}</p>
                <div className="space-y-4">
                  {current.features.map((f, i) => (
                    <motion.div
                      key={f.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.1 }}
                      className="flex items-center gap-4 p-3 rounded-xl bg-accent/50"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <f.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{f.label}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <Button onClick={next} className="w-full mt-8" size="lg">
              {current.cta}
            </Button>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default OnboardingModal;
