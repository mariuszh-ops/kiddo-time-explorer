/**
 * Environment configuration — single source of truth for env vars.
 *
 * All references to import.meta.env.* go through this module. Keeps the
 * rest of the codebase agnostic of Vite-specific APIs and makes it trivial
 * to audit what external config the app consumes.
 *
 * Vite exposes only variables prefixed with VITE_* to the client bundle.
 * Do NOT read non-VITE_ variables here — they won't exist at runtime.
 */

/**
 * Read a required env var. Throws at startup if missing — fail loud, not silent.
 */
function requireEnv(key: keyof ImportMetaEnv, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `[env] Missing required variable: ${String(key)}. ` +
      `Copy .env.example to .env.local and fill it in.`
    );
  }
  return value;
}

/**
 * Read an optional env var. Returns undefined if missing/empty.
 */
function optionalEnv(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") return undefined;
  return value;
}

/**
 * Parse a boolean-ish env value. Accepts "true" / "1" as true, anything else false.
 * Used for feature-flag-style variables that may be toggled per environment.
 */
function boolEnv(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1";
}

/**
 * Public config object. Import { env } from "@/config/env" and read fields.
 * Never reference import.meta.env directly elsewhere in the app.
 */
export const env = {
  // Runtime environment (Vite built-ins)
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,

  // App metadata — optional, used for SEO/OG/Schema.org
  siteUrl: optionalEnv(import.meta.env.VITE_SITE_URL) ?? "https://familyfun.pl",

  // Analytics — optional, app runs fine without them
  plausibleDomain: optionalEnv(import.meta.env.VITE_PLAUSIBLE_DOMAIN),
  gtmId: optionalEnv(import.meta.env.VITE_GTM_ID),

  // Backend — optional until Supabase is wired in
  supabaseUrl: optionalEnv(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: optionalEnv(import.meta.env.VITE_SUPABASE_ANON_KEY),

  // Observability — optional
  sentryDsn: optionalEnv(import.meta.env.VITE_SENTRY_DSN),

  // Feature flag overrides — used during testing to enable features per-environment
  // without touching featureFlags.ts
  enableOnboarding: boolEnv(import.meta.env.VITE_ENABLE_ONBOARDING, false),
} as const;

/**
 * Helper: is Supabase configured? Useful for gradual backend rollout —
 * the app can detect whether to call real API or fall back to local state.
 */
export const isSupabaseConfigured = (): boolean =>
  Boolean(env.supabaseUrl && env.supabaseAnonKey);
