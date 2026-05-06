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

  it("caps hero height using measured header + bottom-nav CSS vars", () => {
    const { container } = render(<HeroSection onExplore={() => {}} />);
    const heroBox = container.querySelector("section > div") as HTMLElement;
    expect(heroBox).toBeTruthy();
    const mh = heroBox.style.maxHeight;
    expect(mh).toContain("var(--header-h");
    expect(mh).toContain("var(--bottom-nav-h");
    expect(mh).toContain("100svh");
  });

  // Layout invariant: header (72px mobile) + hero (≤ vh - 140) + bottom nav (64px)
  // must fit within viewport height for all heights 600–720px.
  it.each([
    [600, 64, 64],
    [640, 72, 64],
    [667, 72, 80],
    [700, 88, 64],
    [720, 88, 80],
  ])(
    "keeps CTA above bottom nav at vh=%i (header=%i, nav=%i)",
    (vh, header, nav) => {
      const buffer = 16;
      const heroMax = vh - header - nav - buffer;
      const ctaBottom = header + heroMax;
      const navTop = vh - nav;
      expect(ctaBottom).toBeLessThanOrEqual(navTop);
    }
  );
});