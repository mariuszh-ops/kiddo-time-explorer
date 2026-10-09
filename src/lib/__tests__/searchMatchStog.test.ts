import { describe, it, expect } from "vitest";
import { mapCatalogRow, type CatalogRow } from "@/lib/catalogClient";
import { activitySearchHaystack, matchesSearchQuery } from "@/lib/searchMatch";

/**
 * Domknięcie 09.10 (M-4-F01, P3): rekord bez miasta dostaje na ekranie etykietę
 * „woj. <województwo>”, a stóg mapy ją zawierał. Serwerowe ff_home_match szuka w surowym
 * `city` (puste), więc fraza „woj” dawała na mapie 98 wyników, na liście 49.
 */
const wiersz = (city: string | null, name = "Wodospad Poidło"): CatalogRow =>
  ({ place_id: "p1", slug: "wodospad-poidlo", name, type: "park", region: "mazowieckie", city, address: null, lat: 52, lng: 21 }) as unknown as CatalogRow;

describe("activitySearchHaystack — parytet z ff_home_match", () => {
  it("etykieta zastępcza „woj. …” nie trafia do stogu", () => {
    const a = mapCatalogRow(wiersz(null));
    expect(a.location).toBe("woj. mazowieckie"); // ekran bez zmian
    expect(activitySearchHaystack(a)).not.toContain("woj");
    expect(matchesSearchQuery(a, "woj")).toBe(false);
    expect(matchesSearchQuery(a, "woj. mazowieckie")).toBe(false);
  });

  it("region nadal wyszukiwalny po nazwie województwa", () => {
    expect(matchesSearchQuery(mapCatalogRow(wiersz(null)), "mazowieckie")).toBe(true);
  });

  it("prawdziwe miasto zostaje w stogu", () => {
    const a = mapCatalogRow(wiersz("Żyrardów"));
    expect(matchesSearchQuery(a, "zyrardow")).toBe(true);
  });

  it("„woj” w nazwie atrakcji nadal trafia (jak na serwerze)", () => {
    expect(matchesSearchQuery(mapCatalogRow(wiersz(null, "Park Wojewódzki")), "woj")).toBe(true);
  });
});
