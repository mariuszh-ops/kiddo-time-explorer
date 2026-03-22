import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, MapPin, Star, Compass, Search, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SavedActivitiesEmptyStateProps {
  type: "favorites" | "wantToVisit" | "visited";
}

const emptyStateContent: Record<string, { icon: LucideIcon; title: string; hint: string; ctaText: string; ctaIcon: LucideIcon }> = {
  favorites: {
    icon: Heart,
    title: "Twoja lista ulubionych czeka",
    hint: "Kliknij serce na atrakcji, żeby ją tu zapisać. Wróć do niej w każdej chwili.",
    ctaText: "Odkrywaj atrakcje",
    ctaIcon: Compass,
  },
  wantToVisit: {
    icon: MapPin,
    title: "Zaplanuj następne wyjście",
    hint: "Zapisuj atrakcje, do których chcesz zabrać dzieci. Twoja rodzinna bucket lista!",
    ctaText: "Znajdź coś fajnego",
    ctaIcon: Search,
  },
  visited: {
    icon: Star,
    title: "Podziel się swoimi wrażeniami",
    hint: "Oceń miejsca, w których byliście — pomożesz innym rodzicom wybrać najlepsze atrakcje.",
    ctaText: "Przeglądaj atrakcje",
    ctaIcon: Search,
  },
};

const SavedActivitiesEmptyState = ({ type }: SavedActivitiesEmptyStateProps) => {
  const content = emptyStateContent[type];
  const IconMain = content.icon;
  const IconCta = content.ctaIcon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 md:py-24 text-center max-w-sm mx-auto px-4"
    >
      <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mb-4">
        <IconMain className="w-7 h-7 text-accent-foreground" />
      </div>

      <h2 className="text-lg md:text-xl font-serif font-medium text-foreground mb-2">
        {content.title}
      </h2>
      
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        {content.hint}
      </p>
      
      <Button asChild>
        <Link to="/">
          <IconCta className="w-4 h-4 mr-2" />
          {content.ctaText}
        </Link>
      </Button>
    </motion.div>
  );
};

export default SavedActivitiesEmptyState;
