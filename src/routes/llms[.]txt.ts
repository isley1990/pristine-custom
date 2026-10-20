import { createFileRoute } from "@tanstack/react-router";

import { FAQS } from "@/components/site/faq-section";
import { categories } from "@/lib/categories";

/** llms.txt: a plain summary that AI assistants and answer engines can read and cite (GEO). */
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const o = process.env.SITE_URL || new URL(request.url).origin;
        const facts = [
          "## Key facts",
          "- Store: Pristine Custom Wheels & Trailer Parts, 1621 91st Ct, Vero Beach, FL 32966, USA. Phone and text: +1 (954) 798-1123. Spanish line (Para Español): +1 (772) 584-9512. Email: pristinecustomwheels@gmail.com.",
          "- Catalog: 2,300+ trailer parts with part numbers, photos and online prices; brands include Dexter, Kodiak, Demco, Dutton-Lainson, LoadStar, TecNiq, DeeMaxx, Knott and CE Smith.",
          "- Ordering: no online payment. Add parts to the quote list and send a quote request on the website, call or text +1 (954) 798-1123, or email pristinecustomwheels@gmail.com. The shop confirms fitment, delivery and the final price, then arranges payment by phone or at pickup.",
          "- Delivery: local delivery priced by road distance from Vero Beach; the exact fee is included in the quote.",
          "- Pickup: free store pickup in Vero Beach, FL.",
          "- Returns: unused parts in original packaging within 30 days; we cover shipping both ways if we sent the wrong part.",
          "- Every order gets a fitment check (bolt pattern, axle rating, tire size) before it ships.",
        ].filter(Boolean);
        facts.push("");
        const body = [
          "# Pristine Custom Wheels & Trailer Parts",
          "",
          "> Trailer parts store in Vero Beach, Florida with 2,300+ parts listed online: custom trailer wheels, ST trailer tires and mounted assemblies, complete axles, hubs and bearings, disc and drum brakes, lights and wiring, leaf springs, couplers, jacks, fenders and boat trailer parts. Customers search by part number, request a quote online or by phone, and choose local delivery priced by distance or free store pickup; every order gets a fitment check.",
          "",
          ...facts,
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
          `- [Contact Us](${o}/contact): call or text +1 (954) 798-1123 (Spanish: +1 (772) 584-9512), email pristinecustomwheels@gmail.com, shop at 1621 91st Ct, Vero Beach, FL 32966 (store pickup available; local delivery priced by distance)`,
          `- [Delivery, Pickup and Return Policy](${o}/shipping-returns)`,
          "",
          "## FAQ",
          ...FAQS.flatMap((f) => [`### ${f.q}`, f.a, ""]),
        ].join("\n");
        return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
      },
    },
  },
});
