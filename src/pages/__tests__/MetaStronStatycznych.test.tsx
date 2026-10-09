import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ComponentType } from "react";
import IndexDirectory from "@/pages/IndexDirectory";
import BlogListPage from "@/pages/BlogListPage";
import Kontakt from "@/pages/Kontakt";
import Regulamin from "@/pages/Regulamin";
import PolitykaPrywatnosci from "@/pages/PolitykaPrywatnosci";
import ONas from "@/pages/ONas";

// Nagłówek i stopka wymagają AuthProvider i katalogu — nie są przedmiotem testu.
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

/**
 * Audyt finalny 750 (AF-3-033/034/037/038/039, P3): po renderze stron statycznych
 * <title> miał 27 (/indeks), 19 (/kontakt) i 29 (/regulamin) znaków, a meta
 * description 63 (/inspiracje) i 56 (/polityka-prywatnosci). Progi jak w audycie:
 * title 30–65, dokładnie 1 description 70–160, canonical == https://familyfun.pl + ścieżka,
 * bez meta robots.
 * Domknięcie 09.10 (DK-3-044, P3): /o-nas miało tytuł „O nas | FamilyFun” (17 znaków).
 */
const STRONY: Array<[string, ComponentType]> = [
  ["/indeks", IndexDirectory],
  ["/inspiracje", BlogListPage],
  ["/kontakt", Kontakt],
  ["/regulamin", Regulamin],
  ["/polityka-prywatnosci", PolitykaPrywatnosci],
  ["/o-nas", ONas],
];

const opisy = () =>
  [...document.head.querySelectorAll('meta[name="description"]')].map((m) => m.getAttribute("content") ?? "");

describe("Meta stron statycznych po renderze (AF-3-033…039)", () => {
  afterEach(() => cleanup());

  it.each(STRONY)("%s: title 30–65, description 70–160, canonical, bez robots", async (sciezka, Strona) => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={[sciezka]}>
          <Strona />
        </MemoryRouter>
      </HelmetProvider>,
    );
    await waitFor(() => expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`https://familyfun.pl${sciezka}`));

    const tytul = document.title;
    expect(tytul.length, `title „${tytul}”`).toBeGreaterThanOrEqual(30);
    expect(tytul.length, `title „${tytul}”`).toBeLessThanOrEqual(65);
    expect(tytul).not.toMatch(/undefined|null|NaN|\[object/);

    const d = opisy();
    expect(d).toHaveLength(1);
    expect(d[0].length, `description „${d[0]}”`).toBeGreaterThanOrEqual(70);
    expect(d[0].length, `description „${d[0]}”`).toBeLessThanOrEqual(160);

    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('meta[name="robots"]')).toHaveLength(0);
  });
});
