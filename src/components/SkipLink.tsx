import { cn } from "@/lib/utils";

const SkipLink = () => {
  return (
    <a
      href="#main-content"
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100]",
        "inline-flex items-center justify-center rounded-lg px-4 py-3",
        "bg-primary text-primary-foreground text-sm font-medium shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      )}
    >
      Przejdź do treści
    </a>
  );
};

export default SkipLink;
