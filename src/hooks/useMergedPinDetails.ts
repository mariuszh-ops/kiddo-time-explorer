import { useEffect, useMemo, useState } from "react";
import type { Activity } from "@/data/activities";
import { fetchPinDetails, getCachedPinDetails, mergePinDetails } from "@/lib/mapPins";

/** Maksymalny rozmiar jednej paczki `in.(slug…)` — tyle wierszy prosimy naraz. */
const PACZKA = 60;
/** Ile milisekund czekamy, żeby przesuwanie mapy nie strzelało zapytaniem na klatkę. */
const ZWLOKA = 350;

/**
 * Dociąga „ładne" pola pinów (zdjęcie, miejscowość, udogodnienia) TYLKO dla
 * kafli, które faktycznie są renderowane — a nie dla całego kadru mapy.
 *
 * Poprzednia wersja (efekt w MapView) brała `displayedActivities`, po każdej
 * paczce podmieniała `visibleActivities`, więc efekt startował od nowa i
 * przelatywał cały kadr partiami po 60: na mapie home (4 897 pinów) było to
 * ~82 zapytania ≈ 1,1 MB na jedno otwarcie mapy (finding A-10). Tutaj pytamy
 * wyłącznie o `activities.slice(0, limit)`, czyli o tyle kafli, ile widać na
 * liście — reszta dociąga się dopiero po „Pokaż więcej" albo po otwarciu dymku.
 *
 * Zwraca przyciętą do `limit` listę ze scalonymi szczegółami.
 */
export function useMergedPinDetails(activities: Activity[], limit: number): Activity[] {
  const [wersja, setWersja] = useState(0);

  const widoczne = useMemo(() => activities.slice(0, limit), [activities, limit]);
  const klucz = useMemo(
    () => widoczne.map((a) => a.slug).filter(Boolean).join(","),
    [widoczne],
  );

  useEffect(() => {
    if (!klucz) return;
    const brakujace = klucz.split(",").filter((s) => !getCachedPinDetails(s));
    if (brakujace.length === 0) return;
    let anulowane = false;
    const timer = window.setTimeout(() => {
      void fetchPinDetails(brakujace.slice(0, PACZKA))
        .then(() => {
          if (!anulowane) setWersja((v) => v + 1);
        })
        .catch(() => {
          /* kafle zostają z placeholderem */
        });
    }, ZWLOKA);
    return () => {
      anulowane = true;
      window.clearTimeout(timer);
    };
  }, [klucz]);

  return useMemo(() => {
    // `wersja` jest w zależnościach celowo: po dojściu paczki trzeba przeliczyć scalanie.
    void wersja;
    return widoczne.map(mergePinDetails);
  }, [widoczne, wersja]);
}

export default useMergedPinDetails;
