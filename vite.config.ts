import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// Public pages are served from Vercel's cache and rebuilt at most once an hour, instead of
// rendering on the server for every visit and every crawler (that used up the free plan's CPU).
// /account, /admin, /healthz and server functions stay live.
const HOUR = 3600;
// ISR drops the query string, so only pages without one use it. The shop (search, sort and page
// live in the query) sets a CDN cache header on its routes instead: src/routes/shop/.
const isr = { isr: HOUR };

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    // TanStack Start must run before the React plugin.
    tanstackStart(),
    // Nitro turns the server build into a Vercel deployment (auto-detected on Vercel).
    nitro({
      routeRules: {
        "/": isr,
        "/about": isr,
        "/contact": isr,
        "/how-to": isr,
        "/shipping-returns": isr,
        "/product/**": isr,
      },
    }),
    react(),
  ],
});
