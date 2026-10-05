import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { geocodeUS } from "../geocode.server";
import { paypalCapture, paypalConfig, paypalCreateOrder, type PPItem } from "../paypal.server";
import { deliveryFee, orderNumber, roundMoney, straightMiles, type DeliveryQuote } from "../store-config";
import { loadSettings } from "../store-settings.server";
import { db } from "../supabase.server";

/* ---------- public config ---------- */

export const getCheckoutConfig = createServerFn({ method: "GET" }).handler(async () => {
  const s = await loadSettings();
  const pp = await paypalConfig();
  const online = s.payments.paypalEnabled && pp.ready;
  return {
    store: { address: s.store.address, pickupHours: s.store.pickupHours },
    pickupEnabled: s.delivery.pickupEnabled,
    deliveryEnabled: s.delivery.enabled,
    delivery: {
      baseFee: s.delivery.baseFee,
      includedMiles: s.delivery.includedMiles,
      ratePerMile: s.delivery.ratePerMile,
      maxMiles: s.delivery.maxMiles,
      freeOver: s.delivery.freeOver,
      freeWithinMiles: s.delivery.freeWithinMiles,
    },
    taxRate: s.tax.rate,
    payments: {
      online,
      paypal: online,
      venmo: online && s.payments.venmoEnabled,
      card: online && s.payments.cardEnabled,
      payLater: s.payments.payLaterEnabled,
      clientId: online ? s.payments.clientId : "",
      mode: s.payments.mode,
    },
  };
});

/* ---------- pricing (always server side) ---------- */

const itemsSchema = z.array(z.object({ sku: z.string().trim().min(1).max(40), qty: z.number().int().min(1).max(99) })).min(1).max(60);
const addressSchema = z.object({
  street: z.string().trim().max(120).default(""),
  city: z.string().trim().max(60).default(""),
  state: z.string().trim().max(20).default("FL"),
  zip: z.string().trim().max(10).default(""),
});

type Line = { sku: string; name: string; slug: string; qty: number; price: number; lineTotal: number };

async function priceCart(items: { sku: string; qty: number }[]) {
  const skus = [...new Set(items.map((i) => i.sku))];
  const { data, error } = await db().from("pristine_products").select("part_number, name, slug, price, active").in("part_number", skus);
  if (error) throw new Error("Could not load prices. Try again.");
  const bySku = new Map((data ?? []).map((r) => [r.part_number as string, r]));
  const lines: Line[] = [];
  const unpriced: string[] = [];
  const missing: string[] = [];
  for (const i of items) {
    const p = bySku.get(i.sku);
    if (!p || !p.active) {
      missing.push(i.sku);
      continue;
    }
    if (p.price == null) {
      unpriced.push(i.sku);
      continue;
    }
    const price = Number(p.price);
    lines.push({ sku: i.sku, name: p.name as string, slug: p.slug as string, qty: i.qty, price, lineTotal: roundMoney(price * i.qty) });
  }
  const subtotal = roundMoney(lines.reduce((n, l) => n + l.lineTotal, 0));
  return { lines, subtotal, unpriced, missing };
}

type Fulfillment = "delivery" | "pickup";

async function computeTotals(input: { items: { sku: string; qty: number }[]; fulfillment: Fulfillment; address: z.infer<typeof addressSchema> }) {
  const s = await loadSettings();
  const cart = await priceCart(input.items);
  let delivery: DeliveryQuote | null = null;
  let geo: Awaited<ReturnType<typeof geocodeUS>> = null;
  let addressError: string | null = null;
  if (input.fulfillment === "delivery") {
    const a = input.address;
    if (!a.street || !(a.zip || a.city)) addressError = "Enter the street address and ZIP code for delivery.";
    else {
      geo = await geocodeUS(`${a.street}, ${a.city}, ${a.state} ${a.zip}`);
      if (!geo) addressError = "We could not find that address. Check the street and ZIP code.";
      else delivery = deliveryFee(s.delivery, straightMiles(s.store, geo) * s.delivery.roadFactor, cart.subtotal);
    }
  } else if (!s.delivery.pickupEnabled) addressError = "Store pickup is not available right now.";
  const fee = delivery && delivery.available ? delivery.fee : 0;
  const taxBase = cart.subtotal + (s.tax.taxDelivery ? fee : 0);
  const tax = roundMoney((taxBase * s.tax.rate) / 100);
  const total = roundMoney(cart.subtotal + fee + tax);
  const blocked =
    cart.lines.length === 0
      ? "Your cart has no priced items."
      : cart.unpriced.length
        ? "Some items need a price first. Remove them or send them as a quote request."
        : cart.missing.length
          ? "Some items are no longer available. Remove them to continue."
          : addressError ?? (delivery && !delivery.available ? delivery.reason : null);
  return { settings: s, ...cart, delivery, geo, fee, tax, taxRate: s.tax.rate, total, blocked };
}

const quoteInput = z.object({ items: itemsSchema, fulfillment: z.enum(["delivery", "pickup"]), address: addressSchema });

export const quoteCheckout = createServerFn({ method: "POST" })
  .validator(quoteInput)
  .handler(async ({ data }) => {
    const t = await computeTotals(data);
    return {
      lines: t.lines,
      subtotal: t.subtotal,
      unpriced: t.unpriced,
      missing: t.missing,
      delivery: t.delivery,
      matchedAddress: t.geo?.matched ?? null,
      fee: t.fee,
      tax: t.tax,
      taxRate: t.taxRate,
      total: t.total,
      blocked: t.blocked,
    };
  });

/* ---------- orders ---------- */

const customerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(7).max(30),
  notes: z.string().trim().max(600).default(""),
});

const createInput = quoteInput.extend({
  customer: customerSchema,
  method: z.enum(["paypal", "venmo", "card", "pay_later"]),
  website: z.string().max(0).optional().default(""), // honeypot
});

export const createCheckoutOrder = createServerFn({ method: "POST" })
  .validator(createInput)
  .handler(async ({ data }) => {
    const t = await computeTotals(data);
    if (t.blocked) throw new Error(t.blocked);
    const s = t.settings;
    if (data.method === "pay_later" && !s.payments.payLaterEnabled) throw new Error("That payment option is not available.");
    if (data.method !== "pay_later") {
      const pp = await paypalConfig();
      if (!s.payments.paypalEnabled || !pp.ready) throw new Error("Online payment is not available right now.");
    }
    const a = data.address;
    const { data: row, error } = await db()
      .from("pristine_orders")
      .insert({
        status: data.method === "pay_later" ? "pay_later" : "pending_payment",
        name: data.customer.name,
        email: data.customer.email.toLowerCase(),
        phone: data.customer.phone,
        notes: data.customer.notes || null,
        fulfillment: data.fulfillment,
        address: data.fulfillment === "delivery" ? `${a.street}, ${a.city}, ${a.state} ${a.zip}` : null,
        matched_address: t.geo?.matched ?? null,
        lat: t.geo?.lat ?? null,
        lng: t.geo?.lng ?? null,
        miles: t.delivery?.miles ?? null,
        items: t.lines,
        subtotal: t.subtotal,
        delivery_fee: t.fee,
        tax: t.tax,
        total: t.total,
        payment_method: data.method,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error("Could not save the order. Try again or call us.");
    const id = row.id as number;
    if (data.method === "pay_later") return { kind: "saved" as const, orderNo: orderNumber(id), total: t.total };

    const items: PPItem[] = t.lines.map((l) => ({
      name: l.name.slice(0, 127),
      sku: l.sku.slice(0, 127),
      unit_amount: { currency_code: "USD", value: l.price.toFixed(2) },
      quantity: String(l.qty),
    }));
    try {
      const pp = await paypalCreateOrder({ orderId: id, invoice: orderNumber(id), items, itemTotal: t.subtotal, shipping: t.fee, tax: t.tax, total: t.total });
      await db().from("pristine_orders").update({ paypal_order_id: pp.id, updated_at: new Date().toISOString() }).eq("id", id);
      return { kind: "paypal" as const, paypalOrderId: pp.id, orderNo: orderNumber(id) };
    } catch (e) {
      await db().from("pristine_orders").update({ status: "cancelled", admin_notes: `PayPal create failed: ${(e as Error).message}`.slice(0, 500) }).eq("id", id);
      throw new Error("Could not start the payment. Try again or call us.");
    }
  });

export const captureCheckoutOrder = createServerFn({ method: "POST" })
  .validator(z.object({ paypalOrderId: z.string().trim().min(5).max(64) }))
  .handler(async ({ data }) => {
    const { data: order } = await db().from("pristine_orders").select("id, total, status").eq("paypal_order_id", data.paypalOrderId).maybeSingle();
    if (!order) throw new Error("Order not found.");
    if (order.status === "paid") return { ok: true as const, orderNo: orderNumber(order.id as number) };
    const cap = await paypalCapture(data.paypalOrderId);
    const capture = cap.purchase_units?.[0]?.payments?.captures?.[0];
    const paidOk = cap.status === "COMPLETED" && capture?.status === "COMPLETED" && Math.abs(Number(capture.amount.value) - Number(order.total)) < 0.01;
    const source = Object.keys(cap.payment_source ?? {})[0] ?? "paypal";
    const method = source === "venmo" ? "venmo" : source === "card" ? "card" : "paypal";
    const payer = cap.payment_source?.[source]?.email_address ?? cap.payer?.email_address ?? null;
    await db()
      .from("pristine_orders")
      .update({
        status: paidOk ? "paid" : "pending_payment",
        paypal_capture_id: capture?.id ?? null,
        payer_email: payer,
        payment_method: method,
        admin_notes: paidOk ? null : `Capture status ${cap.status}/${capture?.status ?? "none"}; check PayPal.`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    if (!paidOk) throw new Error("The payment did not complete. You were not charged twice; call us if you need help.");
    return { ok: true as const, orderNo: orderNumber(order.id as number) };
  });

/* ---------- order lookup (My Account) ---------- */

export const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Waiting for payment",
  paid: "Paid",
  pay_later: "Placed, pay at pickup or by phone",
  processing: "Being prepared",
  ready: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const trackOrder = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().email().max(160), id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const { data: o } = await db()
      .from("pristine_orders")
      .select("id, created_at, status, fulfillment, matched_address, miles, items, subtotal, delivery_fee, tax, total, payment_method")
      .eq("id", data.id)
      .eq("email", data.email.toLowerCase())
      .maybeSingle();
    if (!o) return { found: false as const };
    return {
      found: true as const,
      order: {
        orderNo: orderNumber(o.id as number),
        created: new Date(o.created_at as string).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }),
        status: STATUS_LABEL[o.status as string] ?? (o.status as string),
        fulfillment: o.fulfillment as string,
        address: (o.matched_address as string | null) ?? null,
        items: o.items as Line[],
        subtotal: Number(o.subtotal),
        fee: Number(o.delivery_fee),
        tax: Number(o.tax),
        total: Number(o.total),
        method: o.payment_method as string,
      },
    };
  });
