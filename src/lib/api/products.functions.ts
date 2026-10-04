import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { categories, productImage } from "../categories";
import { db } from "../supabase.server";

export type ProductCard = {
  partNumber: string;
  slug: string;
  name: string;
  category: string;
  brand: string | null;
  price: number | null;
  inStock: boolean;
  image: string;
};

export type ProductDetail = ProductCard & { description: string | null };

const T = "pristine_products";
const CARD_COLS = "part_number, slug, name, category, brand, price, in_stock, image_path";
export const PAGE_SIZE = 24;

type Row = {
  part_number: string;
  slug: string;
  name: string;
  category: string;
  brand: string | null;
  price: number | string | null;
  in_stock: boolean;
  image_path: string | null;
  description?: string | null;
};

const toCard = (r: Row): ProductCard => ({
  partNumber: r.part_number,
  slug: r.slug,
  name: r.name,
  category: r.category,
  brand: r.brand,
  price: r.price == null ? null : Number(r.price),
  inStock: r.in_stock,
  image: productImage(r.image_path, r.category),
});

/** Turns free text into a Postgres websearch query, keeping part numbers intact. */
const cleanQuery = (q: string) => q.replace(/[^\p{L}\p{N}\s/.\-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);

/** PostgREST `or` filter: exact part number, partial name, or full-text match. */
const searchFilter = (q: string) => `part_number.eq."${q}",name.ilike."%${q}%",search.wfts(english)."${q}"`;

export const listProducts = createServerFn({ method: "GET" })
  .validator(
    z.object({
      category: z.string().max(40).optional(),
      q: z.string().max(80).optional(),
      page: z.number().int().min(1).max(500).default(1),
      sort: z.enum(["relevance", "name", "price-asc", "price-desc"]).default("relevance"),
    }),
  )
  .handler(async ({ data }) => {
    const from = (data.page - 1) * PAGE_SIZE;
    let query = db().from(T).select(CARD_COLS, { count: "exact" }).eq("active", true);
    if (data.category && data.category !== "all") query = query.eq("category", data.category);
    const q = data.q ? cleanQuery(data.q) : "";
    if (q) {
      query = query.or(searchFilter(q));
    }
    if (data.sort === "price-asc") query = query.order("price", { ascending: true, nullsFirst: false });
    else if (data.sort === "price-desc") query = query.order("price", { ascending: false, nullsFirst: false });
    else if (data.sort === "name") query = query.order("name", { ascending: true });
    else query = query.order("featured", { ascending: false }).order("name", { ascending: true });
    const { data: rows, count, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.error(error);
      return { items: [] as ProductCard[], total: 0, page: data.page, pages: 0 };
    }
    const total = count ?? 0;
    return { items: (rows as Row[]).map(toCard), total, page: data.page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
  });

export const quickSearch = createServerFn({ method: "GET" })
  .validator(z.object({ q: z.string().min(2).max(80) }))
  .handler(async ({ data }) => {
    const q = cleanQuery(data.q);
    if (!q) return { items: [] as ProductCard[], total: 0 };
    const { data: rows, count, error } = await db()
      .from(T)
      .select(CARD_COLS, { count: "exact" })
      .eq("active", true)
      .or(searchFilter(q))
      .order("name")
      .limit(6);
    if (error) return { items: [] as ProductCard[], total: 0 };
    return { items: (rows as Row[]).map(toCard), total: count ?? 0 };
  });

export const getProduct = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1).max(120) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await db()
      .from(T)
      .select(`${CARD_COLS}, description`)
      .eq("slug", data.slug)
      .eq("active", true)
      .maybeSingle();
    if (error || !row) return { product: null, related: [] as ProductCard[] };
    const r = row as Row;
    const { data: rel } = await db()
      .from(T)
      .select(CARD_COLS)
      .eq("active", true)
      .eq("category", r.category)
      .neq("slug", r.slug)
      .order("featured", { ascending: false })
      .limit(8);
    return {
      product: { ...toCard(r), description: r.description ?? null } as ProductDetail,
      related: ((rel ?? []) as Row[]).map(toCard),
    };
  });

export const getFeatured = createServerFn({ method: "GET" }).handler(async () => {
  const { data: rows } = await db()
    .from(T)
    .select(CARD_COLS)
    .eq("active", true)
    .eq("featured", true)
    .order("name")
    .limit(8);
  let items = ((rows ?? []) as Row[]).map(toCard);
  if (items.length < 4) {
    // No featured picks yet: show mounted tire and wheel assemblies, the shop's specialty.
    const { data: fill } = await db()
      .from(T)
      .select(CARD_COLS)
      .eq("active", true)
      .eq("category", "tires-wheels")
      .ilike("name", "%on%wheel%")
      .order("name")
      .limit(8 - items.length);
    items = items.concat(((fill ?? []) as Row[]).map(toCard));
  }
  return { items };
});

export const getCategoryCounts = createServerFn({ method: "GET" }).handler(async () => {
  const counts: Record<string, number> = {};
  await Promise.all(
    categories.map(async (c) => {
      const { count } = await db().from(T).select("id", { count: "exact", head: true }).eq("active", true).eq("category", c.id);
      counts[c.id] = count ?? 0;
    }),
  );
  return { counts };
});
