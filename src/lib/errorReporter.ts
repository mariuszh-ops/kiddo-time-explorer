// Lekki reporter błędów JS → RPC log_client_error w projekcie katalogowym.
// Fire-and-forget, nigdy nie rzuca, nigdy nie zwraca promisy.
import { catalogClient } from "@/lib/catalogClient";

const MAX_PER_PAGELOAD = 10;
const sent = new Set<string>();
let count = 0;

export function reportClientError(
  kind: "boundary" | "onerror" | "unhandledrejection",
  error: unknown,
  componentStack?: string
): void {
  try {
    if (import.meta.env.DEV) return;

    const rawMessage = error instanceof Error ? error.message : String(error);
    const message = rawMessage.slice(0, 500);

    let stack = error instanceof Error ? error.stack : undefined;
    if (componentStack) {
      stack = `${stack ?? ""}\n\n${componentStack}`;
    }
    if (stack) stack = stack.slice(0, 4000);

    const page = `${window.location.pathname}${window.location.search}`;

    // Filtr szumu
    if (message.includes("ResizeObserver loop")) return;
    if (message === "Script error.") return;
    if (stack && stack.includes("extension://")) return;

    // Dławik w obrębie jednego załadowania strony
    const fingerprint = `${kind}|${message}|${page}`;
    if (sent.has(fingerprint)) return;
    if (count >= MAX_PER_PAGELOAD) return;
    sent.add(fingerprint);
    count += 1;

    catalogClient
      .rpc("log_client_error", {
        p_kind: kind,
        p_message: message,
        p_stack: stack ?? null,
        p_page: page,
      })
      .then(
        () => {},
        () => {}
      );
  } catch {
    // cicho — reporter nie może psuć aplikacji
  }
}
