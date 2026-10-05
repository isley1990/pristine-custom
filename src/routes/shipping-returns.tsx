import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/site/page-shell";
import { breadcrumbJsonLd, pageHead } from "@/lib/site";

export const Route = createFileRoute("/shipping-returns")({
  head: () =>
    pageHead({
      title: "Delivery, Pickup and Return Policy",
      description: "Pay by card online or at pickup. Free store pickup in Vero Beach, FL, local delivery priced by distance, and how returns and refunds work.",
      path: "/shipping-returns",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Shipping and Return Policy", path: "/shipping-returns" }])],
    }),
  component: Policy,
});

const sections = [
  {
    h: "Order processing",
    p: [
      "Pay by debit or credit card at checkout, processed securely by Stripe, or place the order and pay at pickup or by phone.",
      "We check fitment and availability on every order. If something will not fit your trailer, we call you before it leaves the shop and swap or refund it.",
      "Orders are prepared within 1 to 2 business days.",
    ],
  },
  {
    h: "Delivery and pickup",
    p: [
      "Store pickup is free at 1621 91st Ct, Vero Beach, FL 32966. We call or text when your order is ready.",
      "Local delivery is priced by road distance from our shop: a base fee covers the first miles, then a per-mile rate. Checkout shows the exact fee for your address before you pay.",
      "Large orders close to the shop can qualify for free delivery; the threshold is shown at checkout.",
      "Farther than our delivery range? Call or text (954) 797-1123 for parcel or freight options.",
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
    <PageShell accent="Return Policy" lede="How you pay, how parts get to you, and what happens if something needs to come back." title="Shipping and">
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
