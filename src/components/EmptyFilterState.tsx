import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyFilterStateProps {
  onClearFilters: () => void;
}

const EmptyFilterState = ({ onClearFilters }: EmptyFilterStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 md:py-24 text-center max-w-sm mx-auto px-4"
    >
      <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mb-4">
        <SearchX aria-hidden="true" className="w-7 h-7 text-accent-foreground" />
      </div>

      <h2 className="text-lg md:text-xl font-serif font-medium text-foreground mb-2">
        Nic nie pasuje do filtrów
      </h2>

      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        Spróbuj rozszerzyć kryteria — może mniej filtrów albo inne miasto?
      </p>

      <Button
        onClick={onClearFilters}
        className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Wyczyść filtry
      </Button>

      <Link
        to="/"
        className="mt-4 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
      >
        Zobacz inne miasta
      </Link>
    </motion.div>
  );
};

export default EmptyFilterState;