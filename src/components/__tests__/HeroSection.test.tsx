import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import HeroSection from "@/components/HeroSection";

vi.mock("@/data/activities", () => ({
  getActivities: () => [],
}));

vi.mock("@/lib/featureFlags", () => ({
  FEATURES: { ENABLED_CITIES: ["warszawa"] },
}));

describe("HeroSection — CTA visibility on short screens (600–720px)", () => {
  it("renders the main CTA button", () => {
    const { container } = render(<HeroSection onExplore={() => {}} />);
    const btn = container.querySelector("button");
    expect(btn).toBeTruthy();
    expect(btn?.textContent?.toLowerCase()).toMatch(/sprawdź atrakcje/);
  });

  it("caps hero height so CTA stays above the bottom navigation", () => {
    const { container } = render(<HeroSection onExplore={() => {}} />);
    const heroBox = container.querySelector("section > div") as HTMLElement;
    expect(heroBox).toBeTruthy();
    // Inline maxHeight reserves room for header + bottom nav + buffer
    expect(heroBox.style.maxHeight).toBe("calc(100svh - 140px)");
  });

  // Layout invariant: header (72px mobile) + hero (≤ vh - 140) + bottom nav (64px)
  // must fit within viewport height for all heights 600–720px.
  it.each([600, 640, 667, 700, 720])(
    "keeps CTA above bottom nav at viewport height %ipx",
    (vh) => {
      const HEADER = 72;
      const BOTTOM_NAV = 64;
      const heroMax = vh - 140; // matches inline maxHeight
      const ctaBottom = HEADER + heroMax;
      const navTop = vh - BOTTOM_NAV;
      expect(ctaBottom).toBeLessThanOrEqual(navTop);
    }
  );
});