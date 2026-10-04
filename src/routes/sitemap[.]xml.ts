import { createFileRoute } from "@tanstack/react-router";

import { categories } from "@/lib/categories";
import { db } from "@/lib/supabase.server";

const STATIC = ["/", "/shop", "/how-to", "/about", "/contact", "/shipping-returns"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = process.env.SITE_URL || new URL(request.url).origin;
        const urls: { loc: string; lastmod?: string; priority: string }[] = [
          ...STATIC.map((p) => ({ loc: `${origin}${p}`, priority: p === "/" ? "1.0" : "0.7" })),
          ...categories.map((c) => ({ loc: `${origin}/shop/${c.id}`, priority: "0.8" })),
        ];
        try {
          for (let from = 0; ; from += 1000) {
            const { data, error } = await db()
              .from("pristine_products")
              .select("slug, updated_at")
              .eq("active", true)
              .order("id")
              .range(from, from + 999);
            if (error || !data?.length) break;
            for (const r of data) urls.push({ loc: `${origin}/product/${r.slug}`, lastmod: String(r.updated_at).slice(0, 10), priority: "0.6" });
            if (data.length < 1000) break;
          }
        } catch (e) {
          console.error(e);
        }
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls.map(
            (u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.priority}</priority></url>`,
          ),
          "</urlset>",
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600" },
        });
      },
    },
  },
});
