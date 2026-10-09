import { describe, expect, it } from "vitest";
import { mapCatalogRow, type CatalogRow } from "@/lib/catalogClient";

/**
 * Domknięcie masowe 09.10 (M1-R12, P3): 22 rekordy mają w price_note sam symbol
 * poziomu cen Google („$”, „$$”), a karta pokazywała go jako „Cennik orientacyjny”.
 * Taka notatka ma zniknąć — karta wraca wtedy do linku/tekstu „Sprawdź aktualny cennik”.
 */
const wiersz = (price_note: string | null): CatalogRow => ({
  place_id: "ChIJ_test",
  slug: "test-atrakcja",
  name: "Test",
  type: "sport",
  region: "malopolskie",
  city: "Rytro",
  address: null,
  lat: null,
  lng: null,
  rating: 4.5,
  reviews_count: 10,
  description: null,
  price_note,
  phone: null,
  website: null,
  opening_hours: null,
  amenities: null,
  image_url: null,
  good_for_children: null,
  published: true,
});

describe("mapCatalogRow — price_note z samych „$”", () => {
  it.each(["$", "$$", "$$$", " $$ ", "$ $", "", "   "])("„%s” → brak notatki o cenie", (p) => {
    const a = mapCatalogRow(wiersz(p));
    expect(a.priceNote).toBeUndefined();
    expect(a.priceRange).toBeUndefined();
  });

  it.each(["20–40 zł", "od 25 zł", "$10 za osobę", "Wstęp: 15 zł"])("prawdziwa notatka zostaje: „%s”", (p) => {
    const a = mapCatalogRow(wiersz(p));
    expect(a.priceNote).toBe(p);
    expect(a.priceRange).toBe(p);
  });

  it("null zostaje brakiem", () => {
    expect(mapCatalogRow(wiersz(null)).priceNote).toBeUndefined();
  });
});
