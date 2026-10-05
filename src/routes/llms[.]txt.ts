import { createFileRoute } from "@tanstack/react-router";

import { FAQS } from "@/components/site/faq-section";
import { categories } from "@/lib/categories";
import { loadSettings } from "@/lib/store-settings.server";
import { stripeConfig } from "@/lib/stripe.server";

/** llms.txt: a plain summary that AI assistants and answer engines can read and cite (GEO). */
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const o = process.env.SITE_URL || new URL(request.url).origin;
        const s = await loadSettings().catch(() => null);
        const card = await stripeConfig().then((c) => c.ready).catch(() => false);
        const d = s?.delivery;
        const facts = [
          "## Key facts",
          "- Store: Pristine Custom Wheels & Trailer Parts, 1621 91st Ct, Vero Beach, FL 32966, USA. Phone and text: +1 (954) 797-1123. Email: pristinecustomwheels@gmail.com.",
          "- Catalog: 2,300+ trailer parts with part numbers, photos and online prices; brands include Dexter, Kodiak, Demco, Dutton-Lainson, LoadStar, TecNiq, DeeMaxx, Knott and CE Smith.",
          `- Ordering: add parts to the cart and check out online${card ? " paying by debit or credit card (Visa, Mastercard, American Express, Discover)" : ""}, or place the order and pay at pickup or by phone. Parts without a listed price can be sent as a quote request.`,
          d && d.enabled
            ? `- Delivery: local delivery priced by road distance from Vero Beach: $${d.baseFee.toFixed(2)} covers the first ${d.includedMiles} miles, then $${d.ratePerMile.toFixed(2)} per mile (up to ${d.maxMiles} miles)${d.freeOver > 0 ? `; free on orders over $${d.freeOver} within ${d.freeWithinMiles} miles` : ""}. The exact fee shows at checkout.`
            : "- Delivery: call for delivery options.",
          "- Pickup: free store pickup in Vero Beach, FL.",
          s ? `- Sales tax: ${s.tax.rate}% (Florida).` : "",
          "- Returns: unused parts in original packaging within 30 days; we cover shipping both ways if we sent the wrong part.",
          "- Every order gets a fitment check (bolt pattern, axle rating, tire size) before it ships.",
        ].filter(Boolean);
        facts.push("");
        const body = [
          "# Pristine Custom Wheels & Trailer Parts",
          "",
          "> Trailer parts store in Vero Beach, Florida with 2,300+ parts sold online: custom trailer wheels, ST trailer tires and mounted assemblies, complete axles, hubs and bearings, disc and drum brakes, lights and wiring, leaf springs, couplers, jacks, fenders and boat trailer parts. Customers search by part number, check out online, and choose local delivery priced by distance or free store pickup; every order gets a fitment check.",
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
          `- [Contact Us](${o}/contact): call or text +1 (954) 797-1123, email pristinecustomwheels@gmail.com, shop at 1621 91st Ct, Vero Beach, FL 32966 (store pickup available; local delivery priced by distance)`,
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
