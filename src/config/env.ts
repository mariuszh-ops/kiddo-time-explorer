// Guard for non-Vite environments (e.g. postbuild scripts using tsx)
const metaEnv: Record<string, string | boolean | undefined> = (typeof import.meta !== 'undefined' && import.meta.env) || {};

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
  isDev: metaEnv.DEV as boolean ?? false,
  isProd: metaEnv.PROD as boolean ?? true,
  mode: (metaEnv.MODE as string) ?? 'production',

  // App metadata — optional, used for SEO/OG/Schema.org
  siteUrl: optionalEnv(metaEnv.VITE_SITE_URL as string) ?? "https://familyfun.pl",

  // Analytics — optional, app runs fine without them
  plausibleDomain: optionalEnv(metaEnv.VITE_PLAUSIBLE_DOMAIN as string),
  gtmId: optionalEnv(metaEnv.VITE_GTM_ID as string),

  // Backend — optional until Supabase is wired in
  supabaseUrl: optionalEnv(metaEnv.VITE_SUPABASE_URL as string),
  supabaseAnonKey: optionalEnv(metaEnv.VITE_SUPABASE_ANON_KEY as string),

  // Observability — optional
  sentryDsn: optionalEnv(metaEnv.VITE_SENTRY_DSN as string),

  // Feature flag overrides — used during testing to enable features per-environment
  // without touching featureFlags.ts
  enableOnboarding: boolEnv(metaEnv.VITE_ENABLE_ONBOARDING as string, false),
} as const;

/**
 * Helper: is Supabase configured? Useful for gradual backend rollout —
 * the app can detect whether to call real API or fall back to local state.
 */
export const isSupabaseConfigured = (): boolean =>
  Boolean(env.supabaseUrl && env.supabaseAnonKey);
