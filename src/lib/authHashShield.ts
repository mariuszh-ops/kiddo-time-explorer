/**
 * A1000-T, druga polowa oslony zaczetej w index.html.
 *
 * index.html zdejmuje z adresu fragment z tokenami, zanim wykona sie skrypt
 * Plausible. Tutaj oddajemy go z powrotem — i MUSI sie to stac, zanim powstanie
 * klient Supabase, bo to jego `detectSessionInUrl` zaklada sesje z linku
 * potwierdzajacego, a potem sam czysci adres.
 *
 * Dlatego `import "@/lib/authHashShield"` stoi w main.tsx jako PIERWSZY import:
 * `earlyListingStart` ciagnie `listingQuery` -> `catalogClient`, wiec klient
 * powstaje juz przy tamtym imporcie.
 *
 * Swiadomie NIE uzywamy `setSession()` zamiast przywracania adresu: dla linku
 * resetu hasla GoTrue emituje wtedy SIGNED_IN zamiast PASSWORD_RECOVERY, a na
 * SIGNED_IN reaguje AuthReturnHandler.tsx i przeniosl by uzytkownika ze strony
 * ustawiania nowego hasla. Przywrocenie adresu zachowuje semantyke 1:1.
 */
declare global {
  interface Window {
    __ffAuthFragment?: string;
  }
}

if (typeof window !== "undefined") {
  const fragment = window.__ffAuthFragment;
  if (fragment) {
    delete window.__ffAuthFragment;
    try {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search + fragment
      );
    } catch {
      // Brak History API — sesji z linku nie da sie wtedy zalozyc tak czy tak.
    }
  }
}

export {};
