// Shim import.meta.env for scripts that import Vite source files outside Vite
if (import.meta.env === undefined || import.meta.env === null) {
  import.meta.env = { DEV: false, PROD: true, MODE: 'production', SSR: false, BASE_URL: '/' };
}