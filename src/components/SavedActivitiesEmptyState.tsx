import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SavedActivitiesEmptyStateProps {
  type?: "favorites" | "wantToVisit";
}

const SavedActivitiesEmptyState = ({ type = "favorites" }: SavedActivitiesEmptyStateProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 md:py-24 text-center max-w-md mx-auto px-4"
    >
      <h2 className="text-xl md:text-2xl font-serif text-foreground mb-3">
        Nie masz jeszcze zapisanych atrakcji
      </h2>
      <p className="text-muted-foreground mb-8">
        Zapisuj miejsca, które chcesz odwiedzić, aby łatwo do nich wrócić później.
      </p>
      
      <Button asChild>
        <Link to="/">
          <Search className="w-4 h-4 mr-2" />
          Przeglądaj atrakcje
        </Link>
      </Button>
    </motion.div>
  );
};

export default SavedActivitiesEmptyState;
