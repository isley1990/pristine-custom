import { createFileRoute } from "@tanstack/react-router";

import { db } from "@/lib/supabase.server";

/** Setup check: reports whether the database settings work. Never returns secret values. */
export const Route = createFileRoute("/healthz")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL ?? "";
        const key = process.env.SUPABASE_SECRET_KEY ?? "";
        let keyType = "missing";
        if (key.startsWith("sb_secret_")) keyType = "secret";
        else if (key.startsWith("sb_publishable_")) keyType = "publishable (wrong key: use the secret key)";
        else if (key.split(".").length === 3) {
          try {
            const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")) as { role?: string };
            keyType = payload.role === "service_role" ? "legacy service_role" : `legacy ${payload.role ?? "unknown"} (wrong key: use service_role or secret)`;
          } catch {
            keyType = "unrecognized";
          }
        } else if (key) keyType = "unrecognized";
        let products: string;
        try {
          const { count, error } = await db().from("pristine_products").select("id", { count: "exact", head: true });
          products = error ? `error: ${error.message}` : `ok (${count})`;
        } catch (e) {
          products = `error: ${e instanceof Error ? e.message : "unknown"}`;
        }
        const body = {
          supabaseUrl: url ? new URL(url).host : "missing",
          keyType,
          adminKey: process.env.ADMIN_KEY ? "set" : "missing",
          products,
        };
        return new Response(JSON.stringify(body, null, 2), {
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
        });
      },
    },
  },
});
