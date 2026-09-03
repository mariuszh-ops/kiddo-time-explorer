import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * K-13: sonner 1.7.4 nie ma propsa na rolę pojedynczego toasta ani na polską
 * etykietę przycisku zamykania — `<li data-sonner-toast>` wychodzi bez `role`.
 * Region ma `aria-live="polite"`, ale sam komunikat nie jest niczym dla czytnika.
 * Dostawiamy `role="status"` i polską nazwę zamykania obserwatorem, zamiast
 * podnosić wersję biblioteki pod całą aplikacją.
 */
const useToastRoles = (host: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    const root = host.current;
    if (!root || typeof MutationObserver === "undefined") return;
    const stamp = () => {
      root.querySelectorAll<HTMLElement>("[data-sonner-toast]:not([role])").forEach((el) => {
        el.setAttribute("role", "status");
      });
      root.querySelectorAll<HTMLElement>("[data-close-button]").forEach((el) => {
        el.setAttribute("aria-label", "Zamknij powiadomienie");
      });
    };
    stamp();
    const observer = new MutationObserver(stamp);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [host]);
};

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  useToastRoles(hostRef);

  return (
    <div ref={hostRef}>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        // Domyślne 4 s to za mało, żeby przeczytać komunikat o błędzie (K-13).
        duration={6000}
        closeButton
        containerAriaLabel="Powiadomienia"
        toastOptions={{
          classNames: {
            toast:
              "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
            description: "group-[.toast]:text-muted-foreground",
            actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          },
        }}
        {...props}
      />
    </div>
  );
};

export { Toaster, toast };
