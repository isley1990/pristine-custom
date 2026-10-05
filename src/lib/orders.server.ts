import { orderNumber } from "./store-config";
import type { PaymentIntent } from "./stripe.server";
import { db } from "./supabase.server";

/** Mark an order paid when its PaymentIntent succeeded for the full amount. Shared by the checkout page and the webhook. */
export async function applyPaymentIntent(pi: PaymentIntent) {
  const { data: order } = await db().from("pristine_orders").select("id, total, status").eq("stripe_payment_intent", pi.id).maybeSingle();
  if (!order) return { found: false as const };
  const orderNo = orderNumber(order.id as number);
  const expected = Math.round(Number(order.total) * 100);
  if (pi.status === "succeeded" && pi.amount_received >= expected) {
    if (order.status === "pending_payment" || order.status === "cancelled") {
      await db()
        .from("pristine_orders")
        .update({ status: "paid", payment_method: "card", paypal_capture_id: null, payer_email: pi.receipt_email, admin_notes: `Stripe charge ${pi.latest_charge ?? pi.id}`, updated_at: new Date().toISOString() })
        .eq("id", order.id);
    }
    return { found: true as const, paid: true as const, orderNo };
  }
  if (pi.status === "processing") return { found: true as const, paid: false as const, orderNo, message: "Your bank is processing the payment. We will email you when it clears." };
  return { found: true as const, paid: false as const, orderNo, message: pi.last_payment_error?.message || "The card payment did not go through." };
}

