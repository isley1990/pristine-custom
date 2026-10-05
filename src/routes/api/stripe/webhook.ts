import { createFileRoute } from "@tanstack/react-router";

import { applyPaymentIntent } from "@/lib/orders.server";
import { loadStripeWebhookSecret } from "@/lib/store-settings.server";
import { verifyStripeSignature, type PaymentIntent } from "@/lib/stripe.server";

/** Stripe webhook: confirms card payments even if the customer closes the page before it finishes. */
export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = await loadStripeWebhookSecret();
        const raw = await request.text();
        if (!secret || !verifyStripeSignature(raw, request.headers.get("stripe-signature"), secret)) {
          return new Response("invalid signature", { status: 400 });
        }
        const event = JSON.parse(raw) as { type: string; data: { object: PaymentIntent } };
        if (event.type === "payment_intent.succeeded") await applyPaymentIntent(event.data.object);
        return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
