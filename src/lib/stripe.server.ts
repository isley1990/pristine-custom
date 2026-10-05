import { createHmac, timingSafeEqual } from "node:crypto";

import { STRIPE_PK_RE, STRIPE_SK_RE, stripeKeyMode } from "./store-config";
import { loadSettings, loadStripeSecret } from "./store-settings.server";

const API = "https://api.stripe.com/v1";

export async function stripeConfig() {
  const s = await loadSettings();
  const secret = await loadStripeSecret();
  const pk = s.payments.stripePublishableKey;
  const keysOk = STRIPE_PK_RE.test(pk) && STRIPE_SK_RE.test(secret) && stripeKeyMode(pk) === stripeKeyMode(secret);
  return { enabled: s.payments.stripeEnabled, publishableKey: pk, secret, keysOk, ready: s.payments.stripeEnabled && keysOk, mode: stripeKeyMode(pk) };
}

/** Flatten nested params into Stripe's form encoding: metadata[order_id]=1, payment_method_types[0]=card. */
function form(params: Record<string, unknown>, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" ? form(item as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === "object") form(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function stripeRequest<T>(secret: string, method: "GET" | "POST", path: string, params?: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  const url = method === "GET" && params ? `${API}${path}?${form(params)}` : `${API}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      "Stripe-Version": "2024-06-20",
    },
    body: method === "POST" && params ? form(params).toString() : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message || `Stripe error ${res.status}`);
  return json;
}

export type PaymentIntent = {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
  amount_received: number;
  latest_charge: string | null;
  receipt_email: string | null;
  metadata: Record<string, string>;
  last_payment_error?: { message?: string } | null;
};

export async function createPaymentIntent(args: { amountCents: number; orderId: number; orderNo: string; email: string; name: string; phone: string }) {
  const cfg = await stripeConfig();
  if (!cfg.ready) throw new Error("Card payments are not set up yet.");
  return stripeRequest<PaymentIntent>(
    cfg.secret,
    "POST",
    "/payment_intents",
    {
      amount: args.amountCents,
      currency: "usd",
      payment_method_types: ["card"],
      receipt_email: args.email,
      description: `Pristine Custom order ${args.orderNo}`,
      statement_descriptor_suffix: "PRISTINE CUSTOM",
      metadata: { order_id: String(args.orderId), order_no: args.orderNo, customer: args.name.slice(0, 100), phone: args.phone.slice(0, 40) },
    },
    `pi-${args.orderNo}`,
  );
}

export async function retrievePaymentIntent(id: string) {
  const cfg = await stripeConfig();
  if (!cfg.secret) throw new Error("Card payments are not set up yet.");
  return stripeRequest<PaymentIntent>(cfg.secret, "GET", `/payment_intents/${encodeURIComponent(id)}`);
}

/** Verify a Stripe webhook signature header (t=...,v1=...) against the raw body. */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  return sigs.some((sig) => sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}
