import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { categories, productImage } from "../categories";
import { checkPassword, endSession, isAdmin, requireAdmin, startSession } from "../admin-auth.server";
import { db } from "../supabase.server";

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

export const adminLogin = createServerFn({ method: "POST" })
  .validator(z.object({ key: z.string().min(1).max(200) }))
  .handler(async ({ data }) => {
    if (!process.env.ADMIN_KEY) return { ok: false as const, error: "Set ADMIN_KEY in the hosting settings first." };
    if (!checkPassword(data.key)) return { ok: false as const, error: "That key is not correct." };
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
  const [total, active, noPrice, outOfStock, quotes, messages] = await Promise.all([
    head().then(n),
    head().eq("active", true).then(n),
    head().eq("active", true).is("price", null).then(n),
    head().eq("in_stock", false).then(n),
    db().from("pristine_quote_requests").select("id", { count: "exact", head: true }).then(n),
    db().from("pristine_contact_messages").select("id", { count: "exact", head: true }).then(n),
  ]);
  return { total, active, noPrice, outOfStock, quotes, messages };
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
