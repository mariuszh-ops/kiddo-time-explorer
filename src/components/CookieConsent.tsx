import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getRawItem, setRawItem, STORAGE_KEYS } from "@/lib/storage";

const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = getRawItem(STORAGE_KEYS.COOKIE_CONSENT);
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setRawItem(STORAGE_KEYS.COOKIE_CONSENT, 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    setRawItem(STORAGE_KEYS.COOKIE_CONSENT, 'declined');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-[60] p-4"
        >
          <div className="container max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-soft p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <p className="text-sm text-muted-foreground flex-1">
              Używamy plików cookies, aby zapewnić prawidłowe działanie strony.{" "}
              <Link to="/polityka-prywatnosci" className="underline text-foreground hover:text-primary transition-colors">
                Dowiedz się więcej
              </Link>
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={handleDecline}>
                Odrzuć
              </Button>
              <Button size="sm" onClick={handleAccept}>
                Akceptuję
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
