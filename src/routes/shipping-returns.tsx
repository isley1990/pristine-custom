import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/site/page-shell";
import { breadcrumbJsonLd, pageHead } from "@/lib/site";

export const Route = createFileRoute("/shipping-returns")({
  head: () =>
    pageHead({
      title: "Shipping and Return Policy",
      description: "How Pristine Custom ships trailer parts by parcel and freight, and how returns and refunds work.",
      path: "/shipping-returns",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Shipping and Return Policy", path: "/shipping-returns" }])],
    }),
  component: Policy,
});

const sections = [
  {
    h: "Order processing",
    p: [
      "We confirm fitment and availability on every order before it is charged or shipped.",
      "Confirmed orders are prepared within 1 to 2 business days.",
    ],
  },
  {
    h: "Shipping",
    p: [
      "Small parts ship by parcel carrier with tracking.",
      "Axles, mounted wheel and tire packages and other oversized items ship by freight. Freight cost is included in your quote.",
      "Inspect every package on delivery. Report visible freight damage on the delivery receipt and contact us within 48 hours.",
    ],
  },
  {
    h: "Returns",
    p: [
      "Unused parts in original packaging can be returned within 30 days of delivery.",
      "Contact us first to get a return authorization. Returns sent without one cannot be processed.",
      "Custom mounted wheel and tire packages, special orders and electrical parts that have been installed are not returnable.",
      "Return shipping is paid by the customer unless the part was wrong or defective.",
    ],
  },
  {
    h: "Refunds",
    p: [
      "Refunds go back to the original payment method after the return is received and inspected.",
      "If we sent the wrong part, we cover shipping both ways.",
    ],
  },
];

function Policy() {
  return (
    <PageShell accent="Return Policy" lede="Clear rules on how parts get to you and what happens if something needs to come back." title="Shipping and">
      <div className="pc-policy">
        {sections.map((s) => (
          <section className="pc-policy__block pc-glass" key={s.h}>
            <h2>{s.h}</h2>
            <ul>
              {s.p.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ))}
        <p className="pc-policy__cta">
          Questions about an order or a return? <a href="/contact">Contact Us</a>.
        </p>
      </div>
    </PageShell>
  );
}
