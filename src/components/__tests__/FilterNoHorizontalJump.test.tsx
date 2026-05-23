import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FilterDropdown from "@/components/FilterDropdown";
import MobileFilterSheet from "@/components/MobileFilterSheet";

/**
 * E2E-style guard: after a hard refresh at 375px width, neither the desktop
 * portal dropdown nor the mobile bottom sheet may animate from the left
 * edge or jump horizontally on first open.
 *
 * Regression: dropdown previously rendered at {left:0} on first open and
 * then snapped to the trigger position, producing a ~220px slide from the
 * left edge. Fix uses useLayoutEffect so position is committed before paint.
 */

const setViewport = (w: number, h = 812) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: w });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: h });
  window.dispatchEvent(new Event("resize"));
};

const mockTriggerRect = (left: number, top: number, w = 100, h = 36) => {
  // Force every element's bounding rect to a known trigger position so the
  // portaled dropdown has a deterministic target to anchor against.
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    left,
    top,
    right: left + w,
    bottom: top + h,
    width: w,
    height: h,
    x: left,
    y: top,
    toJSON: () => ({}),
  })) as unknown as () => DOMRect;
};

const sampleOptions = [
  { value: "0-3", label: "0–3 lata", count: 12 },
  { value: "4-6", label: "4–6 lat", count: 25 },
];

describe("Filter no-horizontal-jump on 375px hard refresh", () => {
  beforeEach(() => {
    setViewport(375);
  });

  it("FilterDropdown commits trigger-anchored position synchronously on first open (no left:0 paint)", () => {
    // Trigger sits 40px from the left edge at top:120
    mockTriggerRect(40, 120);

    render(
      <FilterDropdown
        label="Wiek dziecka"
        options={sampleOptions}
        hasAnyFilter={false}
        onSelect={() => {}}
      />
    );

    const trigger = screen.getByRole("button", { name: /wiek dziecka/i });
    fireEvent.click(trigger);

    // The portal panel is anchored by inline style.left immediately after
    // the click (useLayoutEffect runs before browser paint).
    const panel = document.querySelector<HTMLDivElement>(
      'div.fixed[style*="left"]'
    );
    expect(panel).not.toBeNull();
    expect(panel!.style.left).toBe("40px");

    // Defense in depth: animation classes must never include a horizontal
    // slide, only fade + zoom (no slide-in-from-left, no translate-x-*).
    const cls = panel!.className;
    expect(cls).not.toMatch(/slide-in-from-left/);
    expect(cls).not.toMatch(/-?translate-x-/);
    expect(cls).toMatch(/animate-in/);
    expect(cls).toMatch(/fade-in/);
    expect(cls).toMatch(/zoom-in/);
  });

  it("MobileFilterSheet at 375px slides from the bottom only (no left/right slide)", () => {
    const noop = () => {};
    render(
      <MemoryRouter>
      <MobileFilterSheet
        isOpen
        onClose={noop}
        filters={{}}
        searchQuery=""
        onSearchChange={noop}
        filterCounts={{
          city: [],
          age: sampleOptions,
          type: [],
          indoor: [],
          activityKind: [],
          distance: [],
          price: [],
          total: 0,
          filtered: 0,
          hasAnyFilter: false,
        }}
        onUpdateFilter={noop}
        onToggleTypeFilter={noop}
        onClearAll={noop}
      />
      </MemoryRouter>
    );

    // Radix sheet content is rendered via portal with data-state="open"
    const sheet = document.querySelector<HTMLElement>('[role="dialog"]');
    expect(sheet).not.toBeNull();

    const cls = sheet!.className;
    // Must be a bottom sheet
    expect(cls).toMatch(/slide-in-from-bottom/);
    // Must NOT slide horizontally — that would create the "fly from left" bug
    expect(cls).not.toMatch(/slide-in-from-left/);
    expect(cls).not.toMatch(/slide-in-from-right/);
    expect(cls).not.toMatch(/-?translate-x-/);

    // Bottom sheet is full viewport width (inset-x-0) — zero horizontal offset
    expect(cls).toMatch(/inset-x-0/);
  });
});
