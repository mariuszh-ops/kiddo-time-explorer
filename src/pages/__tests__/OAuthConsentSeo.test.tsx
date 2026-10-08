import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import OAuthConsent from "@/pages/OAuthConsent";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: vi.fn(), signInWithOAuth: vi.fn() } },
}));

/**
 * GOLIVE GL-5-022 (P3): /.lovable/oauth/consent nie miał meta robots, dziedziczył
 * og:url „/” z index.html i bez wczytanych szczegółów nie miał h1.
 */

const metaContent = (sel: string) =>
  [...document.head.querySelectorAll(sel)].map((m) => m.getAttribute("content"));

describe("OAuthConsent — SEO trasy technicznej", () => {
  afterEach(() => cleanup());

  it("bez authorization_id: noindex, og:url ścieżki consent bez query i jeden h1", async () => {
    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/.lovable/oauth/consent?utm_source=x"]}>
          <OAuthConsent />
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(await screen.findByText(/Brak parametru authorization_id/)).toBeTruthy();
    await waitFor(() => expect(metaContent('meta[name="robots"]')).toEqual(["noindex, nofollow"]));
    expect(metaContent('meta[property="og:url"]')).toEqual(["https://familyfun.pl/.lovable/oauth/consent"]);
    expect(document.querySelectorAll("h1")).toHaveLength(1);
  });
});
