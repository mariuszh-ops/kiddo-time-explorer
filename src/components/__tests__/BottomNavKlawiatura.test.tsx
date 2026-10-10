import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ isLoggedIn: false }) }));

/**
 * K-24 + INP (A1000-P): pasek chowa się przy klawiaturze ekranowej (fokus w polu
 * tekstowym albo widoczny viewport krótszy o > 150 px), ALE `focusin`/`focusout`
 * nie czytają geometrii. Odczyt `visualViewport.height` przy każdym fokusie
 * wymuszał layout całej strony w zadaniu kliku otwierającego modal.
 */
describe("BottomNav — klawiatura ekranowa bez odczytu geometrii przy fokusie", () => {
  let wysokosc = 844;
  let odczyty = 0;
  let vv: EventTarget & { height: number };
  const pierwotne = Object.getOwnPropertyDescriptor(window, "visualViewport");

  beforeEach(() => {
    wysokosc = 844;
    odczyty = 0;
    const cel = new EventTarget();
    Object.defineProperty(cel, "height", { get: () => { odczyty += 1; return wysokosc; } });
    vv = cel as EventTarget & { height: number };
    Object.defineProperty(window, "visualViewport", { configurable: true, value: vv });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
  });
  afterEach(() => {
    cleanup();
    document.body.querySelectorAll("[data-test-pole]").forEach((el) => el.remove());
    if (pierwotne) Object.defineProperty(window, "visualViewport", pierwotne);
    else delete (window as { visualViewport?: unknown }).visualViewport;
  });

  const nav = () => screen.getByRole("navigation", { name: "Nawigacja dolna" });
  const ukryty = () => nav().classList.contains("hidden");
  const dodaj = (html: string) => {
    const w = document.createElement("div");
    w.setAttribute("data-test-pole", "");
    w.innerHTML = html;
    document.body.appendChild(w);
    return w.firstElementChild as HTMLElement;
  };

  it("fokus w polu tekstowym chowa pasek, przycisk go pokazuje — bez czytania visualViewport.height", () => {
    render(<BrowserRouter><BottomNav /></BrowserRouter>);
    expect(ukryty()).toBe(false);
    const przycisk = dodaj("<button>modal</button>");
    const pole = dodaj('<input type="email" />');
    odczyty = 0;

    act(() => przycisk.focus());
    expect(ukryty()).toBe(false);
    act(() => pole.focus());
    expect(ukryty()).toBe(true);
    act(() => przycisk.focus());
    expect(ukryty()).toBe(false);
    expect(odczyty).toBe(0);
  });

  it("skurczony viewport (resize visualViewport) chowa pasek także przy fokusie poza polem", () => {
    render(<BrowserRouter><BottomNav /></BrowserRouter>);
    const przycisk = dodaj("<button>x</button>");
    act(() => {
      wysokosc = 400;
      vv.dispatchEvent(new Event("resize"));
    });
    expect(ukryty()).toBe(true);
    act(() => przycisk.focus());
    expect(ukryty()).toBe(true);
    act(() => {
      wysokosc = 844;
      vv.dispatchEvent(new Event("resize"));
    });
    expect(ukryty()).toBe(false);
  });
});
