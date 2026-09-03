import { describe, expect, it } from "vitest";
import { formatReviewCount, formatReviewCountGoogle } from "@/lib/formatReviewCount";

const NB = "\u00A0";

describe("formatReviewCount", () => {
  it("kryterium odbioru A-14 — kubełki w dół z plusem", () => {
    expect(formatReviewCount(268833)).toBe(`268${NB}tys.+${NB}opinii`);
    expect(formatReviewCount(1730)).toBe(`1,5${NB}tys.+${NB}opinii`);
    expect(formatReviewCount(523)).toBe(`500+${NB}opinii`);
    expect(formatReviewCount(47)).toBe(`40+${NB}opinii`);
    expect(formatReviewCount(7)).toBe(`7${NB}opinii`);
    expect(formatReviewCount(2)).toBe(`2${NB}opinie`);
    expect(formatReviewCount(1)).toBe(`1${NB}opinia`);
  });

  it("brak opinii → null (nigdy zero opinii ani 0+ opinii)", () => {
    expect(formatReviewCount(0)).toBeNull();
    expect(formatReviewCount(null)).toBeNull();
    expect(formatReviewCount(undefined)).toBeNull();
  });

  it("zawsze w dół — plus musi być prawdą", () => {
    expect(formatReviewCount(580)).toBe(`500+${NB}opinii`);
    expect(formatReviewCount(99)).toBe(`90+${NB}opinii`);
    expect(formatReviewCount(999)).toBe(`900+${NB}opinii`);
    expect(formatReviewCount(1999)).toBe(`1,5${NB}tys.+${NB}opinii`);
    expect(formatReviewCount(9999)).toBe(`9,5${NB}tys.+${NB}opinii`);
    expect(formatReviewCount(10999)).toBe(`10${NB}tys.+${NB}opinii`);
  });

  it("granice kubełków", () => {
    expect(formatReviewCount(9)).toBe(`9${NB}opinii`);
    expect(formatReviewCount(10)).toBe(`10+${NB}opinii`);
    expect(formatReviewCount(100)).toBe(`100+${NB}opinii`);
    expect(formatReviewCount(1000)).toBe(`1${NB}tys.+${NB}opinii`);
    expect(formatReviewCount(10000)).toBe(`10${NB}tys.+${NB}opinii`);
  });

  it("wariant ze źródłem dokleja Google, a przy zerze zwraca null", () => {
    expect(formatReviewCountGoogle(268833)).toBe(`268${NB}tys.+${NB}opinii Google`);
    expect(formatReviewCountGoogle(0)).toBeNull();
  });
});
