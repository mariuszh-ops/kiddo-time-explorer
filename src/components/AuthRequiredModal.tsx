import { useState, useEffect } from "react";
import { Mail, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoogleClick?: () => Promise<void> | void;
  onEmailClick?: () => Promise<void> | void;
  onLoginClick?: () => Promise<void> | void;
}

const AuthRequiredModal = ({
  isOpen,
  onClose,
  onGoogleClick,
  onEmailClick,
  onLoginClick,
}: AuthRequiredModalProps) => {
  const [isLoading, setIsLoading] = useState<'google' | 'email' | 'login' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(null);
      setError(null);
    }
  }, [isOpen]);

  const handleAction = async (
    action: (() => Promise<void> | void) | undefined,
    type: 'google' | 'email' | 'login'
  ) => {
    if (!action || isLoading) return;
    
    setError(null);
    setIsLoading(type);
    
    try {
      await action();
    } catch {
      setError("Nie udało się zalogować. Spróbuj ponownie.");
    } finally {
      setIsLoading(null);
    }
  };

  const dismissError = () => setError(null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl font-serif">
            Zapisz to miejsce na później
          </DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            Aby zapisywać ulubione atrakcje i planować wizyty, potrzebujesz konta.
          </DialogDescription>
        </DialogHeader>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/60 border border-border rounded-lg"
            >
              <p className="text-sm text-muted-foreground">
                {error}
              </p>
              <button
                onClick={dismissError}
                className="shrink-0 p-1 rounded-md hover:bg-accent transition-colors"
                aria-label="Zamknij komunikat"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-3 pt-2">
          {/* Google button */}
          <Button 
            onClick={() => handleAction(onGoogleClick, 'google')}
            className="w-full"
            variant="default"
            disabled={isLoading !== null}
          >
            {isLoading === 'google' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logowanie...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Kontynuuj z Google
              </>
            )}
          </Button>

          {/* Email button */}
          <Button 
            onClick={() => handleAction(onEmailClick, 'email')}
            variant="outline"
            className="w-full"
            disabled={isLoading !== null}
          >
            {isLoading === 'email' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logowanie...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Załóż konto przez email
              </>
            )}
          </Button>
        </div>

        {/* Login link */}
        <div className="pt-4 text-center">
          <button
            onClick={() => handleAction(onLoginClick, 'login')}
            disabled={isLoading !== null}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading === 'login' ? 'Logowanie...' : 'Mam już konto — zaloguj się'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthRequiredModal;
