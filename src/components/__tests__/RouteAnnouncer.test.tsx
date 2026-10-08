import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { MemoryRouter, useNavigate, type NavigateFunction } from "react-router-dom";
import RouteAnnouncer, { CISZA_TYTULU_MS, LIMIT_OGLOSZENIA_MS } from "@/components/RouteAnnouncer";

// AF-6-014: po nawigacji SPA czytnik ma dostać tytuł nowej strony (region
// aria-live), ale tylko przy zmianie ŚCIEŻKI — nie przy samym ?query i nie
// przy pierwszym wejściu.

let nawiguj: NavigateFunction;
const Nawigator = () => {
  nawiguj = useNavigate();
  return null;
};

const region = (c: HTMLElement) => c.querySelector('[data-testid="route-announcer"]') as HTMLElement;

// Obserwator mutacji odpala callback w mikrozadaniu — przepychamy je przed
// przesunięciem zegara.
const czekaj = async (ms: number) => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(ms);
  });
};

const renderuj = (start = "/") =>
  render(
    <MemoryRouter initialEntries={[start]}>
      <RouteAnnouncer />
      <Nawigator />
    </MemoryRouter>
  );

describe("RouteAnnouncer — ogłoszenie zmiany trasy (AF-6-014)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.title = "Atrakcje dla dzieci | FamilyFun";
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("region aria-live polite, atomowy, bez role=status (stanowisko FMN liczy [role=status] jako liczniki)", () => {
    const { container } = renderuj();
    const r = region(container);
    expect(r.getAttribute("aria-live")).toBe("polite");
    expect(r.getAttribute("aria-atomic")).toBe("true");
    expect(r.getAttribute("role")).toBeNull();
    expect(r.className).toContain("sr-only");
  });

  it("pierwsze wejście nic nie ogłasza", async () => {
    const { container } = renderuj();
    await czekaj(LIMIT_OGLOSZENIA_MS + 100);
    expect(region(container).textContent).toBe("");
  });

  it("zmiana ścieżki ogłasza NOWY tytuł, gdy Helmet go ustawi", async () => {
    const { container } = renderuj();
    act(() => nawiguj("/atrakcje/zoo-krakow"));
    // tytuł jeszcze stary — nic nie ogłaszamy przed czasem
    await czekaj(CISZA_TYTULU_MS + 50);
    expect(region(container).textContent).toBe("");
    await act(async () => {
      document.title = "Zoo Kraków | FamilyFun";
    });
    await czekaj(CISZA_TYTULU_MS + 50);
    expect(region(container).textContent).toBe("Zoo Kraków | FamilyFun");
  });

  it("czeka, aż tytuł ucichnie (tytuł pośredni nie jest ogłaszany)", async () => {
    const { container } = renderuj();
    act(() => nawiguj("/atrakcje/malopolskie/zoo"));
    await act(async () => {
      document.title = "Ładowanie… | FamilyFun";
    });
    await czekaj(CISZA_TYTULU_MS / 2);
    await act(async () => {
      document.title = "Zoo w Małopolsce | FamilyFun";
    });
    await czekaj(CISZA_TYTULU_MS + 50);
    expect(region(container).textContent).toBe("Zoo w Małopolsce | FamilyFun");
  });

  it("same parametry adresu (?type=, ?view=map) nie są nową stroną", async () => {
    const { container } = renderuj();
    act(() => nawiguj("/?type=zoo&view=map"));
    await act(async () => {
      document.title = "Zoo | FamilyFun";
    });
    await czekaj(LIMIT_OGLOSZENIA_MS + 100);
    expect(region(container).textContent).toBe("");
  });

  it("tytuł bez zmian: po limicie ogłasza bieżący tytuł", async () => {
    const { container } = renderuj();
    act(() => nawiguj("/mazowieckie"));
    await czekaj(LIMIT_OGLOSZENIA_MS - 100);
    expect(region(container).textContent).toBe("");
    await czekaj(200);
    expect(region(container).textContent).toBe("Atrakcje dla dzieci | FamilyFun");
  });

  it("powrót na tę samą stronę (A -> B -> A) ogłasza ją ponownie", async () => {
    const { container } = renderuj();
    act(() => nawiguj("/atrakcje/zoo-krakow"));
    await act(async () => {
      document.title = "Zoo Kraków | FamilyFun";
    });
    await czekaj(CISZA_TYTULU_MS + 50);
    act(() => nawiguj("/"));
    // region czyszczony od razu, więc ponowne wpisanie tytułu jest zmianą treści
    expect(region(container).textContent).toBe("");
    await act(async () => {
      document.title = "Atrakcje dla dzieci | FamilyFun";
    });
    await czekaj(CISZA_TYTULU_MS + 50);
    expect(region(container).textContent).toBe("Atrakcje dla dzieci | FamilyFun");
  });
});
