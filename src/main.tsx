import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reportClientError } from "@/lib/errorReporter";

window.addEventListener("error", (e) => reportClientError("onerror", e.error ?? e.message));
window.addEventListener("unhandledrejection", (e) =>
  reportClientError("unhandledrejection", e.reason)
);

createRoot(document.getElementById("root")!).render(<App />);
