import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reportClientError } from "@/lib/errorReporter";

window.addEventListener("error", (e) => reportClientError("onerror", e.error ?? e.message));
window.addEventListener("unhandledrejection", (e) =>
  reportClientError("unhandledrejection", e.reason)
);

// Pozycją scrolla zarządza aplikacja (przywracanie po „wstecz", reset przy
// nawigacji w przód). Przy "auto" przeglądarka przywraca pozycję z poprzedniej
// trasy po renderze i walczy z naszym scrollTo(0,0).
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

// N-03: hero shella (#as-hero-img) siedzi w index.html jako data URI, wiec jest
// gotowy od razu — ale createRoot czysci #root i potrafi zdjac shell, ZANIM
// przegladarka zdazy go namalowac. Wtedy elementem LCP zostaje <img> Reacta,
// czyli caly lancuch JS (PSI 5,2 s).
//
// POPRAWKA 05.09: jedno requestAnimationFrame NIE wystarcza. Callback rAF-a
// leci PRZED malowaniem klatki, wiec przy CPU x4 (profil PSI mobile) React
// potrafil wystartowac, zanim ta klatka zostala oddana. Teraz czekamy na dwa
// sygnaly naraz:
//   1. wpis `largest-contentful-paint` wskazujacy nasz obrazek — to twardy
//      dowod, ze przegladarka go namalowala I zapisala jako kandydata LCP,
//   2. dwie klatki — zabezpieczenie dla przegladarek bez tego observera.
// Calosc ma twardy limit LIMIT_MS, zeby wolne urzadzenie nie utknelo na shellu.
const LIMIT_MS = 1200;

function najwyzej<T>(p: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([p, new Promise<void>((r) => window.setTimeout(r, Math.max(0, ms)))]);
}

function dwieKlatki(): Promise<void> {
  return new Promise((r) =>
    requestAnimationFrame(() =>
      requestAnimationFrame(() => window.setTimeout(() => r(), 0))
    )
  );
}

// Rozwiazuje sie, gdy przegladarka zglosi nasz obrazek jako kandydata LCP.
function kandydatLCP(id: string): Promise<void> {
  return new Promise((r) => {
    try {
      const obs = new PerformanceObserver((lista) => {
        for (const wpis of lista.getEntries()) {
          const el = (wpis as PerformanceEntry & { element?: Element | null }).element;
          if (el && el.id === id) {
            obs.disconnect();
            r();
            return;
          }
        }
      });
      obs.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      r(); // brak wsparcia — zostaja same klatki
    }
  });
}

function shellNamalowany(): Promise<unknown> {
  const img = document.getElementById("as-hero-img") as HTMLImageElement | null;
  if (!img) return Promise.resolve(); // podstrony: shellu nie ma, montujemy od razu
  const start = performance.now();
  return najwyzej(img.decode().catch(() => undefined), 800).then(() =>
    najwyzej(
      Promise.all([kandydatLCP("as-hero-img"), dwieKlatki()]),
      LIMIT_MS - (performance.now() - start)
    )
  );
}

void shellNamalowany().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
