import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SavedActivitiesEmptyStateProps {
  type: "favorites" | "wantToVisit" | "visited";
}

const emptyStateContent = {
  favorites: {
    title: "Nie masz jeszcze zapisanych miejsc.",
    hint: null,
    ctaText: "Przeglądaj atrakcje",
  },
  wantToVisit: {
    title: "Nie masz jeszcze zaplanowanych wizyt.",
    hint: null,
    ctaText: "Znajdź atrakcje",
  },
  visited: {
    title: "Nie masz jeszcze ocenionych atrakcji.",
    hint: "Oceń odwiedzone miejsca, aby wrócić do nich później.",
    ctaText: "Przeglądaj atrakcje",
  },
};

const SavedActivitiesEmptyState = ({ type }: SavedActivitiesEmptyStateProps) => {
  const content = emptyStateContent[type];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 md:py-24 text-center max-w-md mx-auto px-4"
    >
      <h2 className="text-lg md:text-xl font-medium text-foreground mb-2">
        {content.title}
      </h2>
      
      {content.hint && (
        <p className="text-sm text-muted-foreground mb-6">
          {content.hint}
        </p>
      )}
      
      <div className={content.hint ? "" : "mt-4"}>
        <Button asChild>
          <Link to="/">
            <Search className="w-4 h-4 mr-2" />
            {content.ctaText}
          </Link>
        </Button>
      </div>
    </motion.div>
  );
};

export default SavedActivitiesEmptyState;
