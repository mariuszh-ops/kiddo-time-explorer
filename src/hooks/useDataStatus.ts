import { useSyncExternalStore } from "react";
import { getDataStatus, subscribeDataStatus, type DataStatus } from "@/data/activities";

/**
 * Reaktywny status ładowania katalogu atrakcji (loading / success / error).
 * Komponenty korzystające z getActivities() renderują się od razu z pustymi
 * danymi i dostają re-render, gdy katalog się załaduje.
 */
export function useDataStatus(): DataStatus {
  return useSyncExternalStore(subscribeDataStatus, getDataStatus, getDataStatus);
}
