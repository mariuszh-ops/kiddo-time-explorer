import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { axe } from "vitest-axe";
// vitest-axe eksportuje matcher bez typów wartości — rejestrujemy go przez namespace.
import * as vitestAxeMatchers from "vitest-axe/matchers";
import type { AxeResults } from "axe-core";
import CookieConsent from "@/components/CookieConsent";
import FilterBar from "@/components/FilterBar";
import Profile from "@/pages/Profile";
import { SEARCH_PLACEHOLDER } from "@/lib/searchConfig";

expect.extend(vitestAxeMatchers as Parameters<typeof expect.extend>[0]);

/**
 * AF-6-025: pola bez etykiety (tylko placeholder) — pole „Szukaj…” w FilterBar
 * (gałąź bez podpowiedzi) i pole „Imię dziecka” w profilu (sekcja „Moja rodzina”).
 * AF-6-043: baner cookies był gołym <div> — bez roli i nazwy czytnik go nie rozpozna.
 * Wszystkie trzy miejsca są dziś za wyłączonymi flagami, więc testy włączają flagi w mocku.
 */

vi.mock("@/lib/featureFlags", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/featureFlags")>();
  return {
    ...orig,
    FEATURES: { ...orig.FEATURES, SEARCH_AUTOCOMPLETE: false, MATCH_PERCENTAGE: true },
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isLoggedIn: true,
    isReady: true,
    user: { id: "u1", email: "test@example.com", name: "Test", avatarUrl: null },
    logout: vi.fn(),
    signInWithGoogle: vi.fn(),
  }),
}));
vi.mock("@/contexts/SavedActivitiesContext", () => ({
  useSavedActivities: () => ({ favoritesCount: 0, wantToVisitCount: 0, isLoading: false }),
}));
vi.mock("@/contexts/UserRatingsContext", () => ({
  useUserRatings: () => ({ visitedCount: 0 }),
}));
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));
vi.mock("@/components/AccountSettingsSection", () => ({ default: () => null }));
vi.mock("@/components/PrivacyDataSection", () => ({ default: () => null }));
vi.mock("@/components/SubmitActivityModal", () => ({ default: () => null }));
vi.mock("@/components/AuthRequiredModal", () => ({ default: () => null }));
vi.mock("@/components/PageTransition", () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));

const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } };

describe("AF-6-043: baner cookies jako region z nazwą", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("po 1,5 s pojawia się region „Pliki cookies” z oboma przyciskami w środku", () => {
    render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("region", { name: "Pliki cookies" })).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    const region = screen.getByRole("region", { name: "Pliki cookies" });
    expect(within(region).getByRole("button", { name: "Akceptuję" })).toBeTruthy();
    expect(within(region).getByRole("button", { name: "Odrzuć" })).toBeTruthy();
    expect(within(region).getByRole("link", { name: "Dowiedz się więcej" })).toBeTruthy();
  });

  it("baner nie ma naruszeń axe", async () => {
    const { container } = render(
      <MemoryRouter>
        <CookieConsent />
      </MemoryRouter>,
    );
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    vi.useRealTimers();
    const results = (await axe(container, AXE_OPTIONS)) as AxeResults;
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});

describe("AF-6-025: pole wyszukiwania w FilterBar (bez podpowiedzi) ma nazwę", () => {
  it("po rozwinięciu pole tekstowe nazywa się jak pozostałe pola wyszukiwania", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
    const { container } = render(
      <MemoryRouter>
        <FilterBar
          filters={{}}
          searchQuery=""
          onSearchChange={() => {}}
          filterCounts={{
            city: [],
            age: [],
            type: [],
            indoor: [],
            activityKind: [],
            distance: [],
            price: [],
            total: 100,
            filtered: 100,
            hasAnyFilter: false,
          }}
          onUpdateFilter={() => {}}
          onToggleTypeFilter={() => {}}
          onClearAll={() => {}}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Szukaj" }));
    const pole = screen.getByRole("textbox", { name: SEARCH_PLACEHOLDER });
    expect(pole.getAttribute("placeholder")).toBe("Szukaj…");
    const results = (await axe(container, AXE_OPTIONS)) as AxeResults;
    expect(results.violations.filter((v) => v.id === "label")).toEqual([]);
  });
});

describe("AF-6-025: pole „Imię dziecka” w profilu ma widoczną etykietę", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("po „Dodaj dziecko” pole jest powiązane z etykietą „Imię dziecka”", async () => {
    const { container } = render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dodaj dziecko" }));
    const pole = screen.getByLabelText("Imię dziecka");
    expect(pole.tagName).toBe("INPUT");
    expect(screen.getByRole("textbox", { name: "Imię dziecka" })).toBe(pole);
    // etykieta widoczna (element <label>), nie sam placeholder ani aria-label
    expect(container.querySelector('label[for="child-name"]')?.textContent).toBe("Imię dziecka");
    expect(pole.getAttribute("aria-label")).toBeNull();
    const results = (await axe(container, AXE_OPTIONS)) as AxeResults;
    expect(results.violations.filter((v) => v.id === "label")).toEqual([]);
  });
});
