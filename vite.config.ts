import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    // TanStack Start must run before the React plugin.
    tanstackStart(),
    // Nitro turns the server build into a Vercel deployment (auto-detected on Vercel).
    nitro(),
    react(),
  ],
});
