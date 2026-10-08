import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";

vi.mock("@/lib/errorReporter", () => ({ reportClientError: vi.fn() }));

/**
 * GOLIVE GL-7-004 (P3): ekran „Coś poszło nie tak” po padniętym chunku szedł
 * do Googlebota z HTTP 200 i bez meta robots. Pełnoekranowy fallback ma mieć
 * noindex; padnięta sekcja nie może wyindeksować całej strony.
 */

const Wybuch = () => {
  throw new Error("chunk 404");
};

const robots = () =>
  [...document.head.querySelectorAll('meta[name="robots"]')].map((m) => m.getAttribute("content"));

describe("ErrorBoundary — meta robots na ekranie błędu", () => {
  afterEach(() => {
    cleanup();
    document.head.querySelectorAll('meta[name="robots"]').forEach((m) => m.remove());
  });

  it("pełnoekranowy fallback dodaje noindex, odmontowanie go zdejmuje", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(
      <MemoryRouter>
        <ErrorBoundary fallbackLevel="page">
          <Wybuch />
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Coś poszło nie tak" })).toBeTruthy();
    expect(robots()).toEqual(["noindex, nofollow"]);
    unmount();
    expect(robots()).toEqual([]);
  });

  it("bez błędu nie dodaje meta robots", () => {
    render(
      <MemoryRouter>
        <ErrorBoundary fallbackLevel="page">
          <p>treść</p>
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(robots()).toEqual([]);
  });

  it("fallback sekcji nie dodaje noindex, a „Spróbuj ponownie” niczego nie zostawia", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallbackLevel="section">
        <Wybuch />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Nie udało się załadować tej sekcji.")).toBeTruthy();
    expect(robots()).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: /Spróbuj ponownie/ }));
    expect(robots()).toEqual([]);
  });
});
