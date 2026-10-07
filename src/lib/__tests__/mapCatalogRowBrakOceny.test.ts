import { describe, expect, it } from "vitest";
import { mapCatalogRow, type CatalogRow } from "@/lib/catalogClient";

// GOLIVE GL-4-017: rekord bez oceny w Google (rating null) nie może dać „0,0 w Google”.
const wiersz = (rating: number | null, reviews_count: number | null): CatalogRow => ({
  place_id: "ChIJ_test",
  slug: "test-atrakcja",
  name: "Test",
  type: "sport",
  region: "malopolskie",
  city: "Rytro",
  address: null,
  lat: null,
  lng: null,
  rating,
  reviews_count,
  description: null,
  price_note: null,
  phone: null,
  website: null,
  opening_hours: null,
  amenities: null,
  image_url: null,
  good_for_children: null,
  published: true,
});

describe("mapCatalogRow — brak oceny Google", () => {
  it("rating null → google_rating undefined (nie 0)", () => {
    const a = mapCatalogRow(wiersz(null, 0));
    expect(a.google_rating).toBeUndefined();
    expect(a.rating).toBe(0);
  });

  it("ocena obecna → google_rating = rating", () => {
    const a = mapCatalogRow(wiersz(4.6, 120));
    expect(a.google_rating).toBe(4.6);
    expect(a.google_review_count).toBe(120);
  });
});
