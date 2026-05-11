import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const DataLoadError = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <WifiOff aria-hidden="true" className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-lg md:text-xl font-serif font-medium text-foreground mb-2">
          Nie udało się załadować atrakcji
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Sprawdź połączenie z internetem i spróbuj ponownie. Jeśli problem się powtarza — daj nam znać.
        </p>
        <Button onClick={() => window.location.reload()}>
          Spróbuj ponownie
        </Button>
        <a
          href="/"
          className="mt-4 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Wróć do strony głównej
        </a>
      </div>
    </div>
  );
};

export default DataLoadError;