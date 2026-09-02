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

createRoot(document.getElementById("root")!).render(<App />);
