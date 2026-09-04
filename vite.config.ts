import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

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
      const punkt = bez.indexOf('<script type="module"');
      if (punkt === -1) return html;
      return (
        bez.slice(0, punkt) +
        links.map((l) => l.trim()).join("\n    ") +
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
