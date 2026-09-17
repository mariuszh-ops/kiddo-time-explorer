// Lekki reporter błędów JS → RPC log_client_error w projekcie katalogowym.
// Fire-and-forget, nigdy nie rzuca, nigdy nie zwraca promisy.
import { catalogClient } from "@/lib/catalogClient";

const MAX_PER_PAGELOAD = 10;
const sent = new Set<string>();
let count = 0;

// Parametry kadru mapy niosa pozycje uzytkownika z dokladnoscia do ~1 m
// (useMapUrlState zapisuje je przez toFixed(5)). Do diagnozy bledu nie sa
// potrzebne, a admin widzi `page` w /admin/bledy — wycinamy je.
const PRYWATNE_PARAMY = ["lat", "lng", "zoom"];

function bezWspolrzednych(pathname: string, search: string): string {
  if (!search) return pathname;
  try {
    const params = new URLSearchParams(search);
    // Porownanie bez wzgledu na wielkosc liter — `?LAT=` tez niesie pozycje.
    const bylo = [...params.keys()].filter((klucz) =>
      PRYWATNE_PARAMY.includes(klucz.toLowerCase())
    );
    if (bylo.length === 0) return `${pathname}${search}`;
    for (const klucz of bylo) params.delete(klucz);
    const reszta = params.toString();
    return reszta ? `${pathname}?${reszta}` : pathname;
  } catch {
    // Gdyby cokolwiek poszlo nie tak, wolimy stracic kontekst niz wyslac pozycje.
    return pathname;
  }
}

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

    const page = bezWspolrzednych(
      window.location.pathname,
      window.location.search
    );

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
