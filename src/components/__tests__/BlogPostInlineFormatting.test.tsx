import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import BlogPostPage from "@/pages/BlogPostPage";
import { blogPosts } from "@/data/blogPosts";

// Katalog nie jest tu potrzebny — podmieniamy tylko getActivities, resztę
// modułu (filterOptions itd.) zostawiamy, bo używa jej Footer i modale.
vi.mock("@/data/activities", async (importOriginal) => ({
  ...((await importOriginal()) as object),
  getActivities: () => [],
}));

vi.mock("@/hooks/useDataStatus", () => ({
  useDataStatus: () => "idle",
}));

// Nagłówek i stopka wymagają AuthProvider — nie są przedmiotem tego testu.
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));

const renderPost = (slug: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/inspiracje/${slug}`]}>
        <Routes>
          <Route path="/inspiracje/:slug" element={<BlogPostPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );

describe("BlogPostPage — formatowanie w linii", () => {
  it("zamienia [etykieta](/atrakcje/slug) na klikalny link, a nie na goły tekst", () => {
    const { container } = renderPost("najlepsze-zoo-w-polsce");
    const links = Array.from(
      container.querySelectorAll('article a[href^="/atrakcje/"]')
    );
    expect(links.length).toBeGreaterThan(5);
    expect(links[0].textContent).not.toMatch(/[[\]()]/);
  });

  it("nie zostawia dosłownych gwiazdek z **pogrubienia**", () => {
    const { container } = renderPost("najlepsze-zoo-w-polsce");
    const article = container.querySelector("article");
    expect(article?.textContent).not.toContain("**");
    expect(article?.querySelectorAll("strong").length).toBeGreaterThan(0);
  });

  it("wszystkie wpisy mają city zgodne ze slugiem województwa (albo brak)", () => {
    const REGION_SLUGS = [
      "dolnoslaskie",
      "kujawsko-pomorskie",
      "lubelskie",
      "lubuskie",
      "lodzkie",
      "malopolskie",
      "mazowieckie",
      "opolskie",
      "podkarpackie",
      "podlaskie",
      "pomorskie",
      "slaskie",
      "swietokrzyskie",
      "warminsko-mazurskie",
      "wielkopolskie",
      "zachodniopomorskie",
    ];
    for (const post of blogPosts) {
      if (post.city) expect(REGION_SLUGS).toContain(post.city);
    }
  });
});
