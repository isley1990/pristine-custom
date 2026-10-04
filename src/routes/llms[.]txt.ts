import { createFileRoute } from "@tanstack/react-router";

import { FAQS } from "@/components/site/faq-section";
import { categories } from "@/lib/categories";

/** llms.txt: a plain summary that AI assistants and answer engines can read and cite (GEO). */
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const o = process.env.SITE_URL || new URL(request.url).origin;
        const body = [
          "# Pristine Custom Wheels & Trailer Parts",
          "",
          "> Online trailer parts store with 2,300+ parts: custom trailer wheels, ST trailer tires and mounted assemblies, complete axles, hubs and bearings, disc and drum brakes, lights and wiring, leaf springs, couplers, jacks, fenders and boat trailer parts. Customers search by part number, add parts to a cart and send a quote request; every order gets a fitment check before it ships.",
          "",
          "## Shop",
          `- [All trailer parts](${o}/shop): search by part number, size or brand`,
          ...categories.map((c) => `- [${c.name}](${o}/shop/${c.id}): ${c.blurb}`),
          "",
          "## Guides",
          `- [How to measure a trailer bolt pattern](${o}/how-to#bolt-pattern)`,
          `- [How to repack trailer wheel bearings](${o}/how-to#bearings)`,
          `- [How to replace trailer leaf springs](${o}/how-to#leaf-springs)`,
          `- [How to wire 4-way trailer lights](${o}/how-to#wiring)`,
          "",
          "## Company",
          `- [About Us](${o}/about)`,
          `- [Contact Us](${o}/contact)`,
          `- [Shipping and Return Policy](${o}/shipping-returns)`,
          "",
          "## FAQ",
          ...FAQS.flatMap((f) => [`### ${f.q}`, f.a, ""]),
        ].join("\n");
        return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
      },
    },
  },
});
