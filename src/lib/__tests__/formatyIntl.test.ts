import { describe, expect, it } from "vitest";
import { formatRatingPl } from "@/lib/formatRating";
import { formatReviewCount } from "@/lib/formatReviewCount";

/**
 * AF-5-065: formatery kart trzymają jeden Intl.NumberFormat na moduł zamiast
 * `toLocaleString` przy każdym wywołaniu. Napis ma zostać 1:1 z dawnym kodem
 * (wzorzec niżej to dosłownie dawne ciała funkcji).
 */

const dawnaOcena = (rating: number): string =>
  rating.toLocaleString("pl-PL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const NB = " ";
const dawnyKubelek = (count: number): string => {
  const step = count < 10000 ? 500 : 1000;
  return `${((Math.floor(count / step) * step) / 1000).toLocaleString("pl-PL")}${NB}tys.+${NB}opinii`;
};

describe("formatRatingPl — 1:1 z toLocaleString (AF-5-065)", () => {
  it("0, 4.5, 4.55 dają ten sam napis co dawniej", () => {
    expect(formatRatingPl(0)).toBe("0,0");
    expect(formatRatingPl(4.5)).toBe("4,5");
    expect(formatRatingPl(4.55)).toBe(dawnaOcena(4.55));
  });

  it.each([0, -0, 0.05, 1, 2.25, 3.04, 4.05, 4.449999, 4.5, 4.55, 4.95, 4.96, 4.99, 5, 10, 1234.56, NaN, Infinity])(
    "%s → jak dawny toLocaleString",
    (v) => {
      expect(formatRatingPl(v)).toBe(dawnaOcena(v));
    },
  );

  it("null (ocena z bazy mimo typu) rzuca TypeError jak dawniej, a nie pisze „0,0”", () => {
    const brak = null as unknown as number;
    expect(() => dawnaOcena(brak)).toThrow(TypeError);
    expect(() => formatRatingPl(brak)).toThrow(TypeError);
    expect(() => formatRatingPl(undefined as unknown as number)).toThrow(TypeError);
  });
});

describe("formatReviewCount — kubełek tysięcy 1:1 z toLocaleString (AF-5-065)", () => {
  it.each([1000, 1499, 1500, 1730, 1999, 2000, 9999, 10000, 10999, 268833, 1234567])("%s", (n) => {
    expect(formatReviewCount(n)).toBe(dawnyKubelek(n));
  });
});
