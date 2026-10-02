import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CityFilterDropdown from "@/components/CityFilterDropdown";

/**
 * FMN-B24: jedno przeciagniecie suwaka odleglosci = jeden zapis filtra
 * (jeden wpis w historii), nie zapis przy kazdej posredniej wartosci.
 * Klawisz = jeden zapis na klawisz.
 */
beforeAll(() => {
  // jsdom nie ma PointerEvent ani pointer capture, ktorych uzywa Radix Slider.
  if (typeof window.PointerEvent === "undefined") {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }
    // @ts-expect-error polyfill na potrzeby testu
    window.PointerEvent = PointerEventPolyfill;
  }
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => true;
  Element.prototype.scrollIntoView = () => {};
  // minimalny stub dla useSize w Radix
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const dropdown = (onDistanceChange: (v: number | undefined) => void, selectedDistance?: number) => (
  <CityFilterDropdown
    cityOptions={[{ value: "mazowieckie", label: "Mazowieckie", count: 10 }]}
    selectedCity="mazowieckie"
    selectedDistance={selectedDistance}
    hasAnyFilter
    filteredCount={10}
    onCitySelect={() => {}}
    onDistanceChange={onDistanceChange}
  />
);

const renderDropdown = (onDistanceChange = vi.fn()) => {
  render(dropdown(onDistanceChange));
  fireEvent.click(screen.getByRole("button", { name: /Mazowieckie/ }));
  return onDistanceChange;
};

describe("CityFilterDropdown — suwak odleglosci (FMN-B24)", () => {
  it("przeciagniecie 0 -> 50 km: jeden zapis, po puszczeniu", () => {
    const onDistanceChange = renderDropdown();
    const kciuk = screen.getByRole("slider");
    const root = kciuk.closest("span[dir]") ?? kciuk.parentElement!.parentElement!;
    (root as HTMLElement).getBoundingClientRect = () =>
      ({ left: 0, right: 100, width: 100, top: 0, bottom: 10, height: 10, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

    fireEvent.pointerDown(root, { pointerId: 1, clientX: 1, clientY: 5, button: 0 });
    for (const x of [10, 20, 30, 40, 50]) {
      fireEvent.pointerMove(root, { pointerId: 1, clientX: x, clientY: 5 });
    }
    expect(screen.getByText("50 km")).toBeInTheDocument();
    expect(onDistanceChange).not.toHaveBeenCalled();

    fireEvent.pointerUp(root, { pointerId: 1, clientX: 50, clientY: 5 });
    expect(onDistanceChange).toHaveBeenCalledTimes(1);
    expect(onDistanceChange).toHaveBeenCalledWith(50);
  });

  it("klawiatura: jeden zapis na klawisz", () => {
    const onDistanceChange = renderDropdown();
    const kciuk = screen.getByRole("slider");
    fireEvent.keyDown(kciuk, { key: "ArrowRight" });
    fireEvent.keyDown(kciuk, { key: "ArrowRight" });
    expect(onDistanceChange).toHaveBeenCalledTimes(2);
    expect(onDistanceChange).toHaveBeenNthCalledWith(1, 5);
    expect(onDistanceChange).toHaveBeenNthCalledWith(2, 10);
  });

  it("'wstecz' zdejmuje dist z adresu: suwak wraca na 0 km", () => {
    const onDistanceChange = vi.fn();
    const { rerender } = render(dropdown(onDistanceChange, 50));
    fireEvent.click(screen.getByRole("button", { name: /Mazowieckie/ }));
    expect(screen.getByText("50 km")).toBeInTheDocument();
    rerender(dropdown(onDistanceChange, undefined));
    expect(screen.getByText("0 km", { selector: "span.font-semibold" })).toBeInTheDocument();
    expect(screen.getByRole("slider").getAttribute("aria-valuenow")).toBe("0");
  });
});
