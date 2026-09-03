import { cn } from "@/lib/utils";

/**
 * K-02: sam `href="#main-content"` nie przenosił fokusu — `<main>` nie jest
 * fokusowalny, więc po Enterze aktywny zostawał `<body>` i pierwszy Tab wracał
 * do logo w nagłówku. Nadajemy `tabindex="-1"` w locie i ustawiamy fokus ręcznie,
 * żeby działało na każdej z 20 stron bez dotykania każdej z osobna.
 */
const focusMainContent = (event: React.MouseEvent<HTMLAnchorElement> | React.KeyboardEvent<HTMLAnchorElement>) => {
  const main = document.getElementById("main-content");
  if (!main) return;
  event.preventDefault();
  main.setAttribute("tabindex", "-1");
  main.focus({ preventScroll: true });
  main.scrollIntoView({ block: "start" });
};

const SkipLink = () => {
  return (
    <a
      href="#main-content"
      onClick={focusMainContent}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100]",
        "inline-flex items-center justify-center rounded-lg px-4 py-3 min-h-11 min-w-11",
        "bg-primary text-primary-foreground text-sm font-medium shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      )}

    >
      Przejdź do treści
    </a>
  );
};

export default SkipLink;
