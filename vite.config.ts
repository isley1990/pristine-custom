import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// Public pages are served from Vercel's cache instead of rendering on every visit.
// /account, /admin, /healthz and server functions stay live.
//
// - Rebuilt at most once a day. With ~2,300 product pages, an hourly expiry meant every crawler
//   pass rebuilt them all again (≈38K ISR writes in 3 days on the free plan).
// - allowQuery: [] → ?utm=…, ?fbclid=… and other junk params share one cached copy instead of
//   creating a new ISR write each.
// - Admin edits refresh the affected pages right away (src/lib/revalidate.server.ts), using
//   ISR_BYPASS_TOKEN. Without the token, changes show up within a day.
// The shop (search, sort and page live in the query) uses a CDN cache header: src/routes/shop/.
const DAY = 86400;
const isr = { isr: { expiration: DAY, allowQuery: [] as string[] } };
const bypassToken = process.env.ISR_BYPASS_TOKEN || undefined;

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    // TanStack Start must run before the React plugin.
    tanstackStart(),
    // Nitro turns the server build into a Vercel deployment (auto-detected on Vercel).
    nitro({
      vercel: { config: { version: 3, bypassToken } },
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
