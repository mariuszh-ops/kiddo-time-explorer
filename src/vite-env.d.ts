/// <reference types="vite/client" />

interface ImportMetaEnv {
  // App
  readonly VITE_SITE_URL?: string;

  // Analytics
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  readonly VITE_GTM_ID?: string;

  // Backend (Supabase)
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;

  // Observability
  readonly VITE_SENTRY_DSN?: string;

  // Feature flag overrides
  readonly VITE_ENABLE_ONBOARDING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
