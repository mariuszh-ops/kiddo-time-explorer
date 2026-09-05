import { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import { PendingIntentProvider } from "@/contexts/PendingIntentContext";

/**
 * F-16 — regresja. Listener `popstate` w AuthRequiredModal MUSI być podpięty raz,
 * z pustą tablicą zależności. Konsumenci przekazują `onClose` jako inline-arrow
 * (nowa tożsamość co render), więc lista zależności `[onClose]` odpinała listener
 * i podpinała go od nowa przy każdym renderze. Gdy taki re-render wypadł w trakcie
 * dispatchu `popstate` — a react-router renderuje właśnie wtedy — listener dodany
 * w trakcie dispatchu nie dostawał tego zdarzenia. „Wstecz" nie zamykało modalu
 * i strona cofała się mimo otwartego okna.
 */
describe("AuthRequiredModal — wpis w historii i listener popstate (F-16)", () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  const licznik = (spy: ReturnType<typeof vi.spyOn>) =>
    spy.mock.calls.filter((c) => c[0] === "popstate").length;

  beforeEach(() => {
    addSpy = vi.spyOn(window, "addEventListener");
    removeSpy = vi.spyOn(window, "removeEventListener");
  });
  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("nie przepina listenera przy re-renderze i woła najświeższe onClose", () => {
    const zamkniecia: string[] = [];
    let przerysuj: () => void = () => undefined;

    const Wrapper = () => {
      const [n, setN] = useState(0);
      przerysuj = () => setN((x) => x + 1);
      return (
        <PendingIntentProvider>
          <AuthRequiredModal
            isOpen
            googleOnly
            title={`tytul-${n}`}
            // inline-arrow: nowa tożsamość przy każdym renderze — jak u konsumentów
            onClose={() => zamkniecia.push(`render-${n}`)}
          />
        </PendingIntentProvider>
      );
    };

    render(<Wrapper />);
    const addPoMontowaniu = licznik(addSpy);
    const removePoMontowaniu = licznik(removeSpy);
    expect(addPoMontowaniu).toBe(1);

    act(() => przerysuj());
    act(() => przerysuj());

    // Gdyby wróciła lista zależności [onClose], te liczby by urosły.
    expect(licznik(addSpy)).toBe(addPoMontowaniu);
    expect(licznik(removeSpy)).toBe(removePoMontowaniu);

    // Otwarcie dołożyło wpis-atrapę ze znacznikiem.
    expect(window.history.state?.authModalOpen).toBe(true);

    // „Wstecz": stan bez znacznika zamyka modal, i to najświeższym onClose.
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { idx: 0 } }));
    });
    expect(zamkniecia).toEqual(["render-2"]);

    // Drugie popstate nic już nie robi — wpis-atrapa został zdjęty.
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: { idx: 0 } }));
    });
    expect(zamkniecia).toEqual(["render-2"]);
  });

  it("wpis-atrapa zachowuje stan react-routera (idx), żeby navigate() nie liczył NaN", () => {
    window.history.replaceState({ idx: 3, key: "abc" }, "", window.location.href);
    render(
      <PendingIntentProvider>
        <AuthRequiredModal isOpen googleOnly onClose={() => undefined} />
      </PendingIntentProvider>,
    );
    expect(window.history.state).toMatchObject({ idx: 3, key: "abc", authModalOpen: true });
  });
});
