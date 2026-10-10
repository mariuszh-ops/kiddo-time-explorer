import { memo } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { PendingIntentProvider, usePendingIntent } from "@/contexts/PendingIntentContext";
import { CardAuthModalProvider, useOpenCardAuthModal } from "@/contexts/CardAuthModalContext";

// jsdom nie ma ResizeObservera ani matchMedia, a Radix (Dialog, Checkbox) ich uzywa.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

const signInWithGoogle = vi.fn().mockResolvedValue(undefined);
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ signInWithGoogle, isLoggedIn: false }),
}));
// Formularz e-mail montuje Turnstile — tu nie jest potrzebny.
vi.mock("@/components/EmailAuthForm", () => ({
  default: () => <div data-testid="email-form-mock" />,
}));

/**
 * INP: jeden modal logowania dla wszystkich kart. Zachowanie jak dawny modal
 * w karcie: domyślny tytuł, zamknięcie bez logowania kasuje intencję gościa,
 * otwarcie nie renderuje konsumentów (kart).
 */
describe("CardAuthModalProvider — wspólny modal logowania kart", () => {
  beforeEach(() => {
    sessionStorage.clear();
    signInWithGoogle.mockClear();
  });

  it("otwiera modal z domyślnym tytułem, nie renderuje karty, Escape zamyka i kasuje intencję", async () => {
    let rendery = 0;
    const Karta = memo(() => {
      rendery += 1;
      const otworz = useOpenCardAuthModal();
      const { setPendingIntent } = usePendingIntent();
      return (
        <button
          type="button"
          onClick={() => {
            setPendingIntent({ kind: "favorite", activityId: 1, slug: "a" });
            otworz();
          }}
        >
          serce
        </button>
      );
    });

    render(
      <PendingIntentProvider>
        <CardAuthModalProvider>
          <Karta />
        </CardAuthModalProvider>
      </PendingIntentProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "serce" }));
    });
    expect(screen.getByRole("dialog", { name: "Zapisz to miejsce na później" })).toBeInTheDocument();
    expect(sessionStorage.getItem("ff_pending_intent")).not.toBeNull();
    expect(rendery).toBe(1);

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(sessionStorage.getItem("ff_pending_intent")).toBeNull();
    expect(signInWithGoogle).not.toHaveBeenCalled();
  });
});
