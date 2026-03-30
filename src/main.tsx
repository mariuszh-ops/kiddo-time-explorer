import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const container = document.getElementById("root")!;

if (container.hasChildNodes()) {
  // Pre-rendered HTML exists — hydrate
  hydrateRoot(container, <App />);
} else {
  // Normal render (development)
  createRoot(container).render(<App />);
}
