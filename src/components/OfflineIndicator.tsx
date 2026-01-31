import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setIsRetrying(false);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Attempt to fetch a small resource to verify connection
    try {
      await fetch(window.location.origin, { 
        method: "HEAD",
        cache: "no-store" 
      });
      setIsOffline(false);
    } catch {
      // Still offline
      setIsOffline(true);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="max-w-sm w-full text-center"
          >
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-muted-foreground" />
            </div>

            {/* Headline */}
            <h1 className="text-xl md:text-2xl font-serif text-foreground mb-3">
              Brak połączenia z internetem
            </h1>

            {/* Supporting text */}
            <p className="text-muted-foreground mb-8">
              Sprawdź swoje połączenie i spróbuj ponownie.
            </p>

            {/* Retry button */}
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              size="lg"
              className="w-full sm:w-auto min-w-[200px]"
            >
              {isRetrying ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                  />
                  Łączenie...
                </span>
              ) : (
                "Spróbuj ponownie"
              )}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineIndicator;
