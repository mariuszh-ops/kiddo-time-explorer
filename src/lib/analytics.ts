// ====================================
// ANALYTICS CONFIGURATION
// Zmiana narzędzia = zmiana tego pliku
// ====================================

type AnalyticsProvider = "plausible" | "ga4" | "none";

// >>> ZMIEŃ TU żeby przełączyć provider <<<
export const ANALYTICS_PROVIDER: AnalyticsProvider = "plausible";

// Plausible config
export const PLAUSIBLE_DOMAIN = "familyfun.pl";

// GA4 config (na przyszłość)
export const GA4_MEASUREMENT_ID = ""; // np. "G-XXXXXXXXXX"

// ====================================
// Unified tracking API
// ====================================

export function trackPageView(path: string) {
  if (ANALYTICS_PROVIDER === "plausible" && window.plausible) {
    window.plausible("pageview", { u: window.location.origin + path });
  }
  if (ANALYTICS_PROVIDER === "ga4" && window.gtag) {
    window.gtag("event", "page_view", { page_path: path });
  }
}

export function trackEvent(name: string, props?: Record<string, string | number>) {
  if (ANALYTICS_PROVIDER === "plausible" && window.plausible) {
    window.plausible(name, { props });
  }
  if (ANALYTICS_PROVIDER === "ga4" && window.gtag) {
    window.gtag("event", name, props);
  }
}

// Type declarations for window
declare global {
  interface Window {
    plausible?: (event: string, options?: Record<string, unknown>) => void;
    gtag?: (...args: unknown[]) => void;
  }
}
