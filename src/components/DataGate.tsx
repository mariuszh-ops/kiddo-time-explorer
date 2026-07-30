import { ReactNode } from "react";
import DataLoadError from "@/components/DataLoadError";
import { useDataStatus } from "@/hooks/useDataStatus";

/**
 * Katalog nie jest już pobierany globalnie na starcie — widoki renderują się
 * natychmiast i same dociągają dane zapytaniami punktowymi. Bramka pokazuje
 * już tylko ekran błędu, gdy leniwe dociągnięcie pełnego katalogu padnie.
 */
const DataGate = ({ children }: { children: ReactNode }) => {
  const status = useDataStatus();
  if (status === "error") return <DataLoadError />;
  return <>{children}</>;
};

export default DataGate;
