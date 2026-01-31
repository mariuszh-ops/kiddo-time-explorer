import { motion } from "framer-motion";
import { RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivityLoadErrorProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

const ActivityLoadError = ({ onRetry, isRetrying = false }: ActivityLoadErrorProps) => {
  return (
    <section className="bg-background py-8 md:py-12">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center justify-center py-16 md:py-24 text-center max-w-md mx-auto"
        >
          {/* Icon */}
          <div className="w-14 h-14 mb-6 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-muted-foreground" />
          </div>

          {/* Headline */}
          <h2 className="text-xl md:text-2xl font-serif text-foreground mb-3">
            Nie udało się załadować atrakcji
          </h2>

          {/* Supporting text */}
          <p className="text-muted-foreground mb-8">
            Coś poszło nie tak. Spróbuj ponownie za chwilę.
          </p>

          {/* Retry button */}
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            size="lg"
            className="min-w-[180px]"
          >
            {isRetrying ? (
              <span className="flex items-center gap-2">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RefreshCw className="w-4 h-4" />
                </motion.span>
                Ładowanie...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                Odśwież listę
              </span>
            )}
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default ActivityLoadError;
