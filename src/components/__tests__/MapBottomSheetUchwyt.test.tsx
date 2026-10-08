import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MapBottomSheet from "@/components/MapBottomSheet";

vi.mock("@/contexts/SavedActivitiesContext", () => ({
  useSavedActivities: () => ({ isFavorite: () => false, toggleFavorite: () => {} }),
}));
vi.mock("@/hooks/useMergedPinDetails", () => ({
  useMergedPinDetails: (a: unknown[]) => a,
}));
vi.mock("@/components/MapCategoryChips", () => ({ default: () => null }));

/**
 * AF-6-013 / AF-6-067 (audyt finalny 750, WCAG 2.5.7 + 2.1.1): uchwyt dolnego
 * panelu mapy był divem z onTouchMove/onMouseDown/onClick bez roli, tabIndex
 * i klawiatury — peek/half/full tylko myszą i palcem (390: „DIV tabIndex=-1
 * role=null”). Uchwyt ma być przyciskiem, a Enter/Spacja mają cyklicznie
 * zmieniać stan jak tap. Licznik i „sortuj” nie mogą siedzieć w środku
 * przycisku (axe nested-interactive).
 */

const pokaz = (onSheetStateChange = vi.fn()) => {
  render(
    <MemoryRouter>
      <MapBottomSheet
        visibleActivities={[]}
        highlightedId={null}
        onCardClick={() => {}}
        fading={false}
        onSheetStateChange={onSheetStateChange}
        selectedCategories={new Set()}
        onCategoryToggle={() => {}}
        searchQuery=""
        onSearchChange={() => {}}
      />
    </MemoryRouter>,
  );
  return onSheetStateChange;
};

const uchwyt = () => screen.getByRole("button", { name: /listę atrakcji/ });

describe("MapBottomSheet — uchwyt panelu z klawiatury (AF-6-013/067)", () => {
  beforeEach(() => cleanup());

  it("uchwyt to przycisk w kolejności Tab, z nazwą i aria-expanded", () => {
    pokaz();
    const u = uchwyt();
    expect(u.getAttribute("tabindex")).toBe("0");
    expect(u).toHaveAccessibleName("Rozwiń listę atrakcji");
    expect(u.getAttribute("aria-expanded")).toBe("false");
  });

  it("Enter → Spacja → Enter = half → full → peek (jak tap)", () => {
    const zmiana = pokaz();
    fireEvent.keyDown(uchwyt(), { key: "Enter" });
    expect(zmiana).toHaveBeenLastCalledWith("half");
    expect(uchwyt().getAttribute("aria-expanded")).toBe("true");
    expect(uchwyt()).toHaveAccessibleName("Powiększ listę atrakcji");
    fireEvent.keyDown(uchwyt(), { key: " " });
    expect(zmiana).toHaveBeenLastCalledWith("full");
    expect(uchwyt()).toHaveAccessibleName("Zwiń listę atrakcji");
    fireEvent.keyDown(uchwyt(), { key: "Enter" });
    expect(zmiana).toHaveBeenLastCalledWith("peek");
    expect(uchwyt().getAttribute("aria-expanded")).toBe("false");
    expect(zmiana).toHaveBeenCalledTimes(3);
  });

  it("inne klawisze i przytrzymany Enter nie zmieniają stanu", () => {
    const zmiana = pokaz();
    fireEvent.keyDown(uchwyt(), { key: "Tab" });
    fireEvent.keyDown(uchwyt(), { key: "a" });
    fireEvent.keyDown(uchwyt(), { key: "Enter", repeat: true });
    expect(zmiana).not.toHaveBeenCalled();
  });

  it("tap (klik) dalej cyklicznie rozwija panel", () => {
    const zmiana = pokaz();
    fireEvent.click(uchwyt());
    expect(zmiana).toHaveBeenLastCalledWith("half");
  });

  it("licznik i „sortuj” nie są w środku przycisku-uchwytu", () => {
    pokaz();
    const u = uchwyt();
    expect(u.querySelector("button, [role=status]")).toBeNull();
    const sortuj = screen.getByRole("button", { name: /Ocena/ });
    expect(u.contains(sortuj)).toBe(false);
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
