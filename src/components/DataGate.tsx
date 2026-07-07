import { ReactNode } from "react";
import HomeSkeleton from "@/components/HomeSkeleton";
import DataLoadError from "@/components/DataLoadError";
import { useDataStatus } from "@/hooks/useDataStatus";

/**
 * Bramkuje widoki wymagające katalogu atrakcji: skeleton podczas ładowania,
 * ekran błędu przy niepowodzeniu. Strony statyczne (kontakt, regulamin, blog…)
 * nie używają bramki i renderują się natychmiast.
 */
const DataGate = ({ children }: { children: ReactNode }) => {
  const status = useDataStatus();
  if (status === "loading") return <HomeSkeleton />;
  if (status === "error") return <DataLoadError />;
  return <>{children}</>;
};

export default DataGate;
