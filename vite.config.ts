import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// GL-6-028/029: od L-07 (04.09, 9ab8fad) `.env` jest poza gitem, a Lovable buduje
// produkcje z repo — w buildzie prod nie ma VITE_SUPABASE_*. Generowany przez Lovable
// `src/integrations/supabase/client.ts` (bez zapasu) wola wtedy createClient(undefined)
// i /.lovable/oauth/consent pada na „supabaseUrl is required.” (chunk prod:
// `const $=void 0,P=void 0`). Projekt Lovable Cloud (auth zgody OAuth/MCP) ma URL
// i klucz typu publishable — publiczne z zalozenia, i tak laduja w bundlu, jak klucz
// anon katalogu w `catalogClient.ts`. Wpisujemy je jako ZAPAS: tylko gdy zmiennej nie
// dal ani `.env`, ani srodowisko buildu (te maja pierwszenstwo). NIGDY sb_secret_.
const LOVABLE_CLOUD_PUBLIC_ENV = {
  VITE_SUPABASE_PROJECT_ID: "lcplokzaosphgpwacahe",
  VITE_SUPABASE_URL: "https://lcplokzaosphgpwacahe.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_jN3C6TxIa58KJHEn0XbHeg_o0CEdyR4",
} as const;

function zapasLovableCloud(mode: string): Record<string, string> {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const define: Record<string, string> = {};
  for (const [key, value] of Object.entries(LOVABLE_CLOUD_PUBLIC_ENV)) {
    if (!env[key]) define[`import.meta.env.${key}`] = JSON.stringify(value);
  }
  return define;
}

// Arkusz stylow blokuje render, a Vite wstawia go w <head> PO <script type="module">
// i po piatce modulepreloadow. Na wolnym laczu CSS czeka wtedy w kolejce za ~1 MB
// JS-a i pierwsze malowanie leci o sekundy w tyl (zmierzone: CSS gotowy dopiero
// w 1429 ms, FCP 1608 ms). Przesuwamy <link rel="stylesheet"> przed skrypty (N-03).
const cssPrzedModulami = () => ({
  name: "css-przed-modulami",
  apply: "build" as const,
  enforce: "post" as const,
  transformIndexHtml: {
    order: "post" as const,
    handler(html: string) {
      const re = /[^\S\n]*<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"[^>]*>\n?/g;
      const links = html.match(re);
      if (!links) return html;
      let bez = html.replace(re, "");
      // Paczki JS schodza na fetchpriority="low": na wolnym laczu ~330 kB skryptow
      // dzielilo pasmo po rowno z 45-kilobajtowym hero i obrazek LCP schodzil
      // dopiero w 2,6 s. Skrypty i tak nie blokuja renderu (type=module = defer).
      bez = bez
        .replace(/<script type="module" crossorigin/g, '<script type="module" fetchpriority="low" crossorigin')
        .replace(/<link rel="modulepreload" crossorigin/g, '<link rel="modulepreload" fetchpriority="low" crossorigin');
      // Shell (#app-shell) maluje sie z CSS-a inline w index.html, wiec arkusz
      // aplikacji NIE jest potrzebny do PIERWSZEGO malowania — a jako zasob
      // blokujacy render kosztowal 320-400 ms FCP (audyt render-blocking-resources).
      // Wzorzec jak przy fontach: media="print" nie blokuje renderu, onload
      // przelacza na "all". fetchpriority="high" jest tu istotne — samo
      // media="print" spycha pobranie na najnizszy priorytet, a arkusz ma zdazyc
      // przed zamontowaniem Reacta, zeby nie bylo blysku strony bez stylow.
      const asynchroniczne: string[] = [];
      for (const l of links) {
        const tag = l.trim();
        asynchroniczne.push(
          tag.replace(">", ` media="print" fetchpriority="high" onload="this.media='all'; this.onload=null;">`),
        );
        asynchroniczne.push(`<noscript>${tag}</noscript>`);
      }
      const punkt = bez.indexOf('<script type="module"');
      if (punkt === -1) return html;
      return (
        bez.slice(0, punkt) +
        asynchroniczne.join("\n    ") +
        "\n    " +
        bez.slice(punkt)
      );
    },
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), mcpPlugin(), cssPrzedModulami()].filter(Boolean),
  define: zapasLovableCloud(mode),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Rozbicie zależności na osobne chunki: biblioteki używane tylko na
        // podstronach (wykresy admina, karuzele, kalendarz) nie są pobierane
        // na home/listingu, a wspólne vendory cache'ują się między trasami.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/recharts|d3-|victory/.test(id)) return "charts";
          if (/embla-carousel|vaul|cmdk|react-day-picker|input-otp|react-resizable-panels/.test(id)) return "ui-extra";
          if (/@supabase|@lovable\.dev[\\/]cloud-auth-js/.test(id)) return "supabase";
          if (/framer-motion|popmotion|motion-dom|motion-utils/.test(id)) return "motion";
          if (/date-fns/.test(id)) return "date-fns";
          if (/@radix-ui/.test(id)) return "radix";
          if (/react-router|react-dom|scheduler|[\\/]react[\\/]/.test(id)) return "react-vendor";
        },
      },
    },
  },
}));
