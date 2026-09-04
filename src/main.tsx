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
// czyli caly lancuch JS (PSI 5,2 s). Czekamy na dekodowanie + jedna klatke,
// najwyzej 800 ms; na podstronach shella juz nie ma, wiec montujemy od razu.
function shellNamalowany(): Promise<unknown> {
  const img = document.getElementById("as-hero-img") as HTMLImageElement | null;
  if (!img) return Promise.resolve();
  return Promise.race([
    img.decode().catch(() => undefined),
    new Promise((r) => window.setTimeout(r, 800)),
  ]).then(
    () => new Promise((r) => requestAnimationFrame(() => window.setTimeout(r, 0)))
  );
}

void shellNamalowany().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
