import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { categories, productImage } from "../categories";
import { checkPassword, endSession, isAdmin, requireAdmin, startSession } from "../admin-auth.server";
import { db } from "../supabase.server";
import { DEFAULT_SETTINGS, deliveryFee, orderNumber, straightMiles, type StoreSettings } from "../store-config";
import { clientIdFromEnv, loadPaypalSecret, loadSettings, loadStripeSecret, loadStripeWebhookSecret, saveSettings, savePaypalSecret, saveStripeSecret, saveStripeWebhookSecret, secretFromEnv, stripeEnv } from "../store-settings.server";
import { stripeRequest } from "../stripe.server";
import { STRIPE_PK_RE, STRIPE_SK_RE, STRIPE_WH_RE, stripeKeyMode } from "../store-config";
import { geocodeUS } from "../geocode.server";
import { paypalToken } from "../paypal.server";

const T = "pristine_products";
const ADMIN_PAGE = 50;
const catIds = categories.map((c) => c.id) as [string, ...string[]];

export type AdminProduct = {
  id: number;
  part_number: string;
  slug: string;
  name: string;
  category: string;
  brand: string | null;
  price: number | null;
  description: string | null;
  image_path: string | null;
  image: string;
  active: boolean;
  in_stock: boolean;
  featured: boolean;
  updated_at: string;
};

const COLS = "id, part_number, slug, name, category, brand, price, description, image_path, active, in_stock, featured, updated_at";
const withImage = (r: Omit<AdminProduct, "image">): AdminProduct => ({
  ...r,
  price: r.price == null ? null : Number(r.price),
  image: productImage(r.image_path, r.category),
});

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80).replace(/-$/, "");

export const adminSession = createServerFn({ method: "GET" }).handler(async () => ({
  signedIn: isAdmin(),
  configured: !!process.env.ADMIN_KEY,
}));

/** Admin username: ADMIN_EMAIL if set, otherwise the store's business email. */
const adminEmail = () => (process.env.ADMIN_EMAIL || "pristinecustomwheels@gmail.com").trim().toLowerCase();

export const adminLogin = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().max(200).optional(), key: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    if (!process.env.ADMIN_KEY) return { ok: false as const, error: "Set ADMIN_KEY in the hosting settings first." };
    const emailOk = data.email === undefined || data.email.toLowerCase() === adminEmail();
    if (!checkPassword(data.key) || !emailOk) {
      await new Promise((r) => setTimeout(r, 700)); // slow down guessing
      return { ok: false as const, error: data.email === undefined ? "That key is not correct." : "Email or password is not correct." };
    }
    startSession();
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  endSession();
  return { ok: true as const };
});

export const adminListProducts = createServerFn({ method: "GET" })
  .validator(
    z.object({
      q: z.string().max(80).optional(),
      category: z.string().max(40).optional(),
      status: z.enum(["all", "active", "hidden", "no-price", "out-of-stock", "featured"]).default("all"),
      page: z.number().int().min(1).max(1000).default(1),
    }),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    let query = db().from(T).select(COLS, { count: "exact" });
    if (data.category && data.category !== "all") query = query.eq("category", data.category);
    if (data.status === "active") query = query.eq("active", true);
    if (data.status === "hidden") query = query.eq("active", false);
    if (data.status === "no-price") query = query.is("price", null);
    if (data.status === "out-of-stock") query = query.eq("in_stock", false);
    if (data.status === "featured") query = query.eq("featured", true);
    const q = (data.q ?? "").replace(/[^\p{L}\p{N}\s/.\-]/gu, " ").trim();
    if (q) query = query.or(`part_number.ilike."%${q}%",name.ilike."%${q}%",brand.ilike."%${q}%"`);
    const from = (data.page - 1) * ADMIN_PAGE;
    const { data: rows, count, error } = await query.order("updated_at", { ascending: false }).range(from, from + ADMIN_PAGE - 1);
    if (error) throw new Error("Could not load products.");
    const total = count ?? 0;
    return {
      items: (rows as Omit<AdminProduct, "image">[]).map(withImage),
      total,
      pages: Math.max(1, Math.ceil(total / ADMIN_PAGE)),
    };
  });

export const adminStats = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const head = () => db().from(T).select("id", { count: "exact", head: true });
  const n = (r: { count: number | null }) => r.count ?? 0;
  const [total, active, noPrice, outOfStock, quotes, messages, openOrders] = await Promise.all([
    head().then(n),
    head().eq("active", true).then(n),
    head().eq("active", true).is("price", null).then(n),
    head().eq("in_stock", false).then(n),
    db().from("pristine_quote_requests").select("id", { count: "exact", head: true }).then(n),
    db().from("pristine_contact_messages").select("id", { count: "exact", head: true }).then(n),
    db().from("pristine_orders").select("id", { count: "exact", head: true }).in("status", ["paid", "pay_later", "processing", "ready", "out_for_delivery"]).then(n),
  ]);
  return { total, active, noPrice, outOfStock, quotes, messages, openOrders };
});

const productInput = z.object({
  id: z.number().int().positive().optional(),
  part_number: z.string().trim().min(1).max(40),
  name: z.string().trim().min(3).max(200),
  category: z.enum(catIds),
  brand: z.string().trim().max(60).nullable().default(null),
  price: z.number().min(0).max(100000).nullable().default(null),
  description: z.string().trim().max(5000).nullable().default(null),
  image_path: z.string().trim().max(300).nullable().default(null),
  active: z.boolean().default(true),
  in_stock: z.boolean().default(true),
  featured: z.boolean().default(false),
});

export const adminSaveProduct = createServerFn({ method: "POST" })
  .validator(productInput)
  .handler(async ({ data }) => {
    requireAdmin();
    const row = {
      part_number: data.part_number,
      name: data.name,
      category: data.category,
      brand: data.brand || null,
      price: data.price,
      description: data.description || null,
      image_path: data.image_path || null,
      active: data.active,
      in_stock: data.in_stock,
      featured: data.featured,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { data: saved, error } = await db().from(T).update(row).eq("id", data.id).select(COLS).single();
      if (error) throw new Error(error.code === "23505" ? "Another product already uses that part number." : "Could not save the product.");
      return { product: withImage(saved as Omit<AdminProduct, "image">) };
    }
    let slug = slugify(data.name);
    const { data: clash } = await db().from(T).select("id").eq("slug", slug).maybeSingle();
    if (clash) slug = `${slug}-${data.part_number.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const { data: saved, error } = await db().from(T).insert({ ...row, slug }).select(COLS).single();
    if (error) throw new Error(error.code === "23505" ? "Another product already uses that part number." : "Could not create the product.");
    return { product: withImage(saved as Omit<AdminProduct, "image">) };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    requireAdmin();
    const { error } = await db().from(T).delete().eq("id", data.id);
    if (error) throw new Error("Could not delete the product.");
    return { ok: true as const };
  });

export const adminBulkUpdate = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ids: z.array(z.number().int().positive()).min(1).max(500),
      patch: z.object({
        active: z.boolean().optional(),
        in_stock: z.boolean().optional(),
        featured: z.boolean().optional(),
        category: z.enum(catIds).optional(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const { error } = await db().from(T).update({ ...data.patch, updated_at: new Date().toISOString() }).in("id", data.ids);
    if (error) throw new Error("Could not update the selected products.");
    return { ok: true as const, updated: data.ids.length };
  });

/** Bulk price import: one `part_number,price` per line. Empty price clears it (back to "Call for price"). */
export const adminImportPrices = createServerFn({ method: "POST" })
  .validator(z.object({ csv: z.string().min(1).max(200000) }))
  .handler(async ({ data }) => {
    requireAdmin();
    const lines = data.csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let updated = 0;
    const missing: string[] = [];
    const bad: string[] = [];
    for (const line of lines) {
      const [pnRaw, priceRaw = ""] = line.split(/[,;\t]/);
      const pn = (pnRaw ?? "").trim();
      if (!pn || /part/i.test(pn)) continue;
      const cleaned = priceRaw.replace(/[$\s]/g, "");
      const price = cleaned === "" ? null : Number(cleaned);
      if (price !== null && (!Number.isFinite(price) || price < 0)) {
        bad.push(line);
        continue;
      }
      const { data: rows, error } = await db()
        .from(T)
        .update({ price, updated_at: new Date().toISOString() })
        .eq("part_number", pn)
        .select("id");
      if (error) bad.push(line);
      else if (!rows?.length) missing.push(pn);
      else updated += 1;
    }
    return { updated, missing: missing.slice(0, 50), missingCount: missing.length, bad: bad.slice(0, 20) };
  });

export const adminUploadImage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      partNumber: z.string().trim().min(1).max(40),
      contentType: z.enum(["image/webp", "image/jpeg", "image/png"]),
      base64: z.string().min(10).max(4_000_000),
    }),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const ext = data.contentType.split("/")[1];
    const safe = data.partNumber.replace(/[^A-Za-z0-9_-]/g, "");
    const path = `uploads/${safe}-${Date.now()}.${ext}`;
    const bytes = Buffer.from(data.base64, "base64");
    const { error } = await db().storage.from("pristine-products").upload(path, bytes, {
      contentType: data.contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw new Error("Could not upload the photo.");
    return { path, url: productImage(path, "tires-wheels") };
  });

export const adminListQuotes = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const { data, error } = await db()
    .from("pristine_quote_requests")
    .select("id, created_at, name, phone, email, category, items, details")
    .order("id", { ascending: false })
    .limit(200);
  if (error) throw new Error("Could not load quote requests.");
  return {
    rows: (data ?? []).map((r) => ({
      ...r,
      created_at: String(r.created_at).replace("T", " ").slice(0, 16),
      items: Array.isArray(r.items) ? (r.items as string[]) : [],
    })),
  };
});

export const adminListMessages = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const { data, error } = await db()
    .from("pristine_contact_messages")
    .select("id, created_at, name, email, phone, topic, message")
    .order("id", { ascending: false })
    .limit(200);
  if (error) throw new Error("Could not load messages.");
  return { rows: (data ?? []).map((r) => ({ ...r, created_at: String(r.created_at).replace("T", " ").slice(0, 16) })) };
});

/* ---------- Orders ---------- */

export type AdminOrder = {
  id: number;
  orderNo: string;
  created_at: string;
  status: string;
  name: string;
  email: string;
  phone: string;
  fulfillment: string;
  address: string | null;
  matched_address: string | null;
  miles: number | null;
  items: { sku: string; name: string; slug: string; qty: number; price: number; lineTotal: number }[];
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  payment_method: string;
  paypal_capture_id: string | null;
  payer_email: string | null;
  notes: string | null;
  admin_notes: string | null;
};

const ORDER_STATUSES = ["pending_payment", "paid", "pay_later", "processing", "ready", "out_for_delivery", "completed", "cancelled", "refunded"] as const;

export const adminListOrders = createServerFn({ method: "GET" })
  .validator(z.object({ status: z.string().default("open"), page: z.number().int().min(1).default(1) }))
  .handler(async ({ data }) => {
    requireAdmin();
    let q = db()
      .from("pristine_orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((data.page - 1) * 30, data.page * 30 - 1);
    if (data.status === "open") q = q.in("status", ["paid", "pay_later", "processing", "ready", "out_for_delivery"]);
    else if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    const orders: AdminOrder[] = (rows ?? []).map((r) => ({
      ...(r as Omit<AdminOrder, "orderNo">),
      orderNo: orderNumber(r.id as number),
      created_at: new Date(r.created_at as string).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }),
      miles: r.miles == null ? null : Number(r.miles),
      subtotal: Number(r.subtotal),
      delivery_fee: Number(r.delivery_fee),
      tax: Number(r.tax),
      total: Number(r.total),
    }));
    return { orders, total: count ?? 0 };
  });

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int().positive(), status: z.enum(ORDER_STATUSES), admin_notes: z.string().max(1000).nullable() }))
  .handler(async ({ data }) => {
    requireAdmin();
    const { error } = await db()
      .from("pristine_orders")
      .update({ status: data.status, admin_notes: data.admin_notes, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ---------- Settings ---------- */

export const adminGetSettings = createServerFn({ method: "GET" }).handler(async () => {
  requireAdmin();
  const s = await loadSettings();
  const secret = await loadPaypalSecret();
  const stripeSecret = await loadStripeSecret();
  const stripeWh = await loadStripeWebhookSecret();
  return {
    settings: s,
    secretSet: !!secret,
    secretFromEnv: secretFromEnv(),
    clientIdFromEnv: clientIdFromEnv(),
    credsLookValid: CLIENT_ID_RE.test(s.payments.clientId) && !!secret,
    stripe: {
      secretSet: !!stripeSecret,
      secretMode: stripeKeyMode(stripeSecret),
      webhookSet: !!stripeWh,
      env: stripeEnv(),
      keysOk: STRIPE_PK_RE.test(s.payments.stripePublishableKey) && STRIPE_SK_RE.test(stripeSecret) && stripeKeyMode(stripeSecret) === stripeKeyMode(s.payments.stripePublishableKey),
    },
  };
});

const num = (min: number, max: number) => z.number().finite().min(min).max(max);
const settingsSchema = z.object({
  store: z.object({ name: z.string().trim().min(2).max(120), address: z.string().trim().min(5).max(200), lat: num(-90, 90), lng: num(-180, 180), pickupHours: z.string().trim().max(160) }),
  delivery: z.object({
    enabled: z.boolean(),
    pickupEnabled: z.boolean(),
    baseFee: num(0, 1000),
    includedMiles: num(0, 500),
    ratePerMile: num(0, 50),
    tierBreakMiles: num(0, 2000),
    tierRatePerMile: num(0, 50),
    minFee: num(0, 1000),
    maxMiles: num(1, 3000),
    roadFactor: num(1, 2),
    freeOver: num(0, 100000),
    freeWithinMiles: num(0, 3000),
  }),
  tax: z.object({ rate: num(0, 20), taxDelivery: z.boolean() }),
  payments: z.object({
    paypalEnabled: z.boolean(),
    venmoEnabled: z.boolean(),
    cardEnabled: z.boolean(),
    payLaterEnabled: z.boolean(),
    mode: z.enum(["sandbox", "live"]),
    clientId: z.string().trim().max(200),
    stripeEnabled: z.boolean(),
    stripePublishableKey: z.string().trim().max(300),
  }),
});

/** PayPal REST credentials look like long tokens: Client ID starts with "A", Secret with "E". */
const CLIENT_ID_RE = /^A[A-Za-z0-9_-]{40,}$/;
const SECRET_RE = /^E[A-Za-z0-9_-]{40,}$/;
const credError = (clientId: string, secret: string | null) => {
  if (clientId && !CLIENT_ID_RE.test(clientId))
    return "That Client ID is not a PayPal API key. Copy it from developer.paypal.com → Apps & Credentials (about 80 characters, starts with A). Do not use your email.";
  if (secret && !SECRET_RE.test(secret))
    return "That Secret is not a PayPal API secret. Copy it from developer.paypal.com → Apps & Credentials (about 80 characters, starts with E). Never enter your PayPal password here.";
  return null;
};

export const adminSaveSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      settings: settingsSchema,
      newSecret: z.string().trim().max(300).optional(),
      clearSecret: z.boolean().optional(),
      newStripeSecret: z.string().trim().max(300).optional(),
      newStripeWebhook: z.string().trim().max(300).optional(),
      clearStripe: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    requireAdmin();
    const s = data.settings as StoreSettings;
    const bad = credError(clientIdFromEnv() ? "" : s.payments.clientId, data.newSecret || null);
    if (bad) return { ok: false as const, error: bad };
    const sbad = await stripeCredError(s.payments.stripePublishableKey, data.newStripeSecret || null, data.newStripeWebhook || null, s.payments.stripeEnabled && !data.clearStripe);
    if (sbad) return { ok: false as const, error: sbad };
    // If the store address changed, refresh its coordinates.
    const prev = await loadSettings();
    if (s.store.address !== prev.store.address) {
      const g = await geocodeUS(s.store.address);
      if (!g) return { ok: false as const, error: "Could not find the store address. Check it and save again." };
      s.store.lat = g.lat;
      s.store.lng = g.lng;
    }
    await saveSettings(s);
    if (data.clearSecret) await savePaypalSecret("");
    else if (data.newSecret) await savePaypalSecret(data.newSecret);
    if (data.clearStripe) {
      await saveStripeSecret("");
      await saveStripeWebhookSecret("");
    } else {
      if (data.newStripeSecret) await saveStripeSecret(data.newStripeSecret);
      if (data.newStripeWebhook) await saveStripeWebhookSecret(data.newStripeWebhook);
    }
    return { ok: true as const };
  });

export const adminTestPaypal = createServerFn({ method: "POST" })
  .validator(z.object({ mode: z.enum(["sandbox", "live"]), clientId: z.string().trim().max(200), secret: z.string().trim().max(300).optional() }))
  .handler(async ({ data }) => {
    requireAdmin();
    const saved = await loadSettings();
    const clientId = clientIdFromEnv() ? saved.payments.clientId : data.clientId;
    const secret = data.secret || (await loadPaypalSecret());
    if (!clientId || !secret) return { ok: false as const, error: "Enter the Client ID and Secret first." };
    const bad = credError(clientId, data.secret || null);
    if (bad) return { ok: false as const, error: bad };
    try {
      await paypalToken({ mode: data.mode, clientId, secret });
      return { ok: true as const, message: `Connected to PayPal (${data.mode === "live" ? "Live" : "Sandbox"}). Save settings to turn payments on.` };
    } catch {
      return { ok: false as const, error: `PayPal rejected these keys in ${data.mode === "live" ? "Live" : "Sandbox"} mode. Check that the mode matches the tab you copied the keys from.` };
    }
  });

async function stripeCredError(pk: string, newSecret: string | null, newWebhook: string | null, enabling: boolean) {
  if (pk && !STRIPE_PK_RE.test(pk)) return "That is not a Stripe Publishable key. Copy it from dashboard.stripe.com → Developers → API keys (starts with pk_test_ or pk_live_).";
  if (newSecret && !STRIPE_SK_RE.test(newSecret)) return "That is not a Stripe Secret key. Copy it from dashboard.stripe.com → Developers → API keys (starts with sk_test_, sk_live_ or rk_). Never enter your Stripe password here.";
  if (newWebhook && !STRIPE_WH_RE.test(newWebhook)) return "That is not a Stripe webhook signing secret (it starts with whsec_).";
  const secret = newSecret || (await loadStripeSecret());
  if (pk && secret && stripeKeyMode(pk) !== stripeKeyMode(secret)) return "The Publishable key and Secret key are from different modes (one test, one live). Use both test keys or both live keys.";
  if (enabling && (!pk || !secret)) return "To turn on card payments, add both the Stripe Publishable key and Secret key.";
  return null;
}

export const adminTestStripe = createServerFn({ method: "POST" })
  .validator(z.object({ publishableKey: z.string().trim().max(300), secret: z.string().trim().max(300).optional() }))
  .handler(async ({ data }) => {
    requireAdmin();
    const secret = data.secret || (await loadStripeSecret());
    const bad = await stripeCredError(data.publishableKey, data.secret || null, null, true);
    if (bad) return { ok: false as const, error: bad };
    try {
      await stripeRequest<{ data: unknown[] }>(secret, "GET", "/payment_intents", { limit: 1 });
      const mode = stripeKeyMode(secret) === "live" ? "Live (real charges)" : "Test (no real charges)";
      return { ok: true as const, message: `Connected to Stripe in ${mode} mode. Save settings to turn card payments on.` };
    } catch (e) {
      return { ok: false as const, error: `Stripe rejected the Secret key: ${(e as Error).message}` };
    }
  });

export const adminTestDelivery = createServerFn({ method: "POST" })
  .validator(z.object({ address: z.string().trim().min(5).max(200), subtotal: num(0, 100000), delivery: settingsSchema.shape.delivery }))
  .handler(async ({ data }) => {
    requireAdmin();
    const s = await loadSettings();
    const g = await geocodeUS(data.address);
    if (!g) return { ok: false as const, error: "Address not found." };
    const q = deliveryFee(data.delivery, straightMiles(s.store, g) * data.delivery.roadFactor, data.subtotal);
    return { ok: true as const, matched: g.matched, quote: q };
  });

export { DEFAULT_SETTINGS };
