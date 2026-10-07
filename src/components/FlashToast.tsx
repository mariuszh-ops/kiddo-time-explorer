import { useEffect } from "react";
import { toast } from "sonner";
import { takeFlashToast } from "@/lib/flashToast";

/**
 * GL-2-039: pokazuje raz komunikat odłożony przed pełnym przeładowaniem
 * (np. „Twoje konto zostało usunięte” po wylogowaniu). Montowany w App
 * ZA `<Sonner />`, żeby Toaster już nasłuchiwał; setTimeout bez sprzątania,
 * bo komunikat jest zdjęty z sessionStorage w pierwszym przebiegu efektu.
 */
const FlashToast = () => {
  useEffect(() => {
    const message = takeFlashToast();
    if (!message) return;
    window.setTimeout(() => toast.success(message), 0);
  }, []);
  return null;
};

export default FlashToast;
