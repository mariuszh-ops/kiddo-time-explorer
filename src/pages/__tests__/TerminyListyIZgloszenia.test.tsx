import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import MyPlaces from "@/pages/MyPlaces";
import Footer from "@/components/Footer";

/**
 * Audyt finalny 750 (AF-10-015/016, P3): na /my-places ta sama lista miała trzy nazwy
 * („Moje miejsca”, „Twoje ulubione miejsca”, „zapisane miejsca/atrakcje”), a formularz
 * zgłoszenia miejsca cztery-pięć etykiet („Dodaj atrakcję”, „Dodaj nowe miejsce”,
 * „Dodaj miejsce”, „Zgłoś nowe miejsce”, „Zgłoś atrakcję”).
 * Po poprawce: strona nazywa się jak link w nagłówku („Moje miejsca”) w obu stanach i w karcie
 * przeglądarki, a wejścia do formularza mają jego tytuł („Zgłoś atrakcję”, ta nazwa jest też
 * w polityce prywatności).
 */

const auth = vi.hoisted(() => ({ isLoggedIn: false }));

vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/SubmitActivityModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog">Zgłoś atrakcję</div> : null),
}));
vi.mock("@/components/AuthRequiredModal", () => ({
  default: ({ isOpen, title }: { isOpen: boolean; title: string }) => (isOpen ? <div role="dialog">{title}</div> : null),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isLoggedIn: auth.isLoggedIn, signInWithGoogle: vi.fn() }),
}));
vi.mock("@/contexts/SavedActivitiesContext", () => ({
  useSavedActivities: () => ({
    favorites: [],
    wantToVisit: [],
    removeFromFavorites: vi.fn(),
    removeFromWantToVisit: vi.fn(),
    favoritesCount: 0,
    wantToVisitCount: 0,
    isLoading: false,
    loadError: false,
    retryLoadSaved: vi.fn(),
  }),
}));
vi.mock("@/contexts/UserRatingsContext", () => ({
  useUserRatings: () => ({ visitedActivities: [], visitedCount: 0 }),
}));

const renderuj = (el: JSX.Element, sciezka = "/my-places") =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[sciezka]}>{el}</MemoryRouter>
    </HelmetProvider>,
  );

const ZLE_NAZWY_LISTY = /zapisan|Twoje ulubione miejsca/i;
const ZLE_ETYKIETY = /Dodaj atrakcję|Dodaj nowe miejsce|Dodaj miejsce|Zgłoś nowe miejsce/i;

describe("AF-10-015 — jedna nazwa listy na /my-places", () => {
  beforeEach(() => {
    auth.isLoggedIn = false;
    // MyPlaces przewija do góry przy montażu; jsdom nie implementuje scrollTo
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });
  afterEach(() => cleanup());

  it("gość: h1 i tytuł karty = „Moje miejsca”, bez „zapisane”/„Twoje ulubione miejsca”", async () => {
    renderuj(<MyPlaces />);
    expect(screen.getByRole("heading", { level: 1 }).textContent?.trim()).toBe("Moje miejsca");
    await waitFor(() => expect(document.title).toBe("Moje miejsca | FamilyFun"));
    screen.getByRole("button", { name: /Zaloguj się lub załóż konto/ }).click();
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toBe("Zaloguj się, aby zobaczyć swoje miejsca");
    expect(document.body.textContent).not.toMatch(ZLE_NAZWY_LISTY);
  });

  it("zalogowany: h1 i tytuł karty = „Moje miejsca”, zakładka „Ulubione”, CTA „Zgłoś atrakcję”", async () => {
    auth.isLoggedIn = true;
    renderuj(<MyPlaces />);
    expect(screen.getByRole("heading", { level: 1 }).textContent?.trim()).toBe("Moje miejsca");
    await waitFor(() => expect(document.title).toBe("Moje miejsca | FamilyFun"));
    expect(screen.getByText("Twoje ulubione atrakcje i lista miejsc do odwiedzenia")).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Ulubione/ })).toBeTruthy();
    const naglowekStrony = screen.getByRole("region", { name: "Moje miejsca" });
    expect(within(naglowekStrony).getByRole("button", { name: "Zgłoś atrakcję" })).toBeTruthy();
    // stopka (prawdziwa) też ma „Zgłoś atrakcję” — razem 2 wejścia, jedna nazwa
    expect(screen.getAllByRole("button", { name: "Zgłoś atrakcję" })).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(ZLE_NAZWY_LISTY);
    expect(document.body.textContent).not.toMatch(ZLE_ETYKIETY);
  });
});

describe("AF-10-016 — jedna nazwa akcji zgłoszenia miejsca", () => {
  afterEach(() => cleanup());

  it("stopka: przycisk „Zgłoś atrakcję” otwiera formularz o tym samym tytule", async () => {
    renderuj(<Footer />, "/");
    const nav = screen.getByRole("navigation", { name: "Stopka" });
    const przycisk = within(nav).getByRole("button", { name: "Zgłoś atrakcję" });
    expect(nav.textContent).not.toMatch(ZLE_ETYKIETY);
    przycisk.click();
    expect((await screen.findByRole("dialog")).textContent).toBe("Zgłoś atrakcję");
  });
});
