import { createFileRoute } from "@tanstack/react-router";

import { categories, productImage } from "@/lib/categories";
import { db } from "@/lib/supabase.server";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const STATIC = ["/", "/shop", "/how-to", "/about", "/contact", "/shipping-returns"];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = process.env.SITE_URL || new URL(request.url).origin;
        const urls: { loc: string; lastmod?: string; priority: string; image?: string }[] = [
          ...STATIC.map((p) => ({ loc: `${origin}${p}`, priority: p === "/" ? "1.0" : "0.7" })),
          ...categories.map((c) => ({ loc: `${origin}/shop/${c.id}`, priority: "0.8" })),
        ];
        try {
          for (let from = 0; ; from += 1000) {
            const { data, error } = await db()
              .from("pristine_products")
              .select("slug, updated_at, image_path, category")
              .eq("active", true)
              .order("id")
              .range(from, from + 999);
            if (error || !data?.length) break;
            for (const r of data) {
              const img = productImage(r.image_path as string | null, r.category as string);
              urls.push({ loc: `${origin}/product/${r.slug}`, lastmod: String(r.updated_at).slice(0, 10), priority: "0.6", image: img.startsWith("http") ? img : `${origin}${img}` });
            }
            if (data.length < 1000) break;
          }
        } catch (e) {
          console.error(e);
        }
        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
          ...urls.map(
            (u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.priority}</priority>${u.image ? `<image:image><image:loc>${esc(u.image)}</image:loc></image:image>` : ""}</url>`,
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
