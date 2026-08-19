import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger(), mcpPlugin()].filter(Boolean),
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
