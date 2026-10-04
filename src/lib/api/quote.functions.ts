import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { db } from "../supabase.server";

const QUOTES = "pristine_quote_requests";
const MESSAGES = "pristine_contact_messages";

export type QuoteRow = {
  id: number;
  created_at: string;
  name: string;
  phone: string | null;
  email: string | null;
  category: string;
  items: string;
  details: string | null;
};

export type ContactRow = {
  id: number;
  created_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  topic: string;
  message: string;
};

// The UI parses `items` as a JSON string; Postgres returns jsonb as an array.
const toRow = (r: Record<string, unknown>): QuoteRow =>
  ({ ...r, items: JSON.stringify(r.items ?? []) }) as QuoteRow;

const fmtDate = (iso: string) => iso.replace("T", " ").slice(0, 19);

const quoteInput = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  category: z.enum(["Wheels", "Tires", "Trailer parts", "Accessories"]),
  details: z.string().trim().max(3000).optional().default(""),
  items: z.array(z.string().max(160)).max(60).default([]),
  website: z.string().max(200).optional().default(""),
});

export const submitQuote = createServerFn({ method: "POST" })
  .validator(quoteInput)
  .handler(async ({ data }) => {
    // Honeypot: bots fill the hidden field; pretend success and store nothing.
    if (data.website) return { ok: true as const, id: null };
    if (!data.phone && !data.email) throw new Error("Add a phone number or an email so we can reply.");
    if (data.email && !z.string().email().safeParse(data.email).success) {
      throw new Error("That email address doesn't look right.");
    }
    const { data: row, error } = await db()
      .from(QUOTES)
      .insert({
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        category: data.category,
        items: data.items,
        details: data.details || null,
      })
      .select("id")
      .single();
    if (error) {
      console.error(error);
      throw new Error("We could not save your request. Please try again.");
    }
    return { ok: true as const, id: (row?.id as number | undefined) ?? null };
  });

const contactInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  topic: z.enum(["Order question", "Fitment help", "Returns", "Other"]),
  message: z.string().trim().min(5).max(4000),
  website: z.string().max(200).optional().default(""),
});

export const submitContact = createServerFn({ method: "POST" })
  .validator(contactInput)
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const };
    if (!data.phone && !data.email) throw new Error("Add a phone number or an email so we can reply.");
    if (data.email && !z.string().email().safeParse(data.email).success) {
      throw new Error("That email address doesn't look right.");
    }
    const { error } = await db().from(MESSAGES).insert({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      topic: data.topic,
      message: data.message,
    });
    if (error) {
      console.error(error);
      throw new Error("We could not send your message. Please try again.");
    }
    return { ok: true as const };
  });

export const trackRequest = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().email().max(160), id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    const { data: row, error } = await db()
      .from(QUOTES)
      .select("id, created_at, name, category, items, details")
      .eq("id", data.id)
      .ilike("email", data.email.replace(/[%_\\]/g, (m) => `\\${m}`))
      .maybeSingle();
    if (error || !row) return { found: false as const };
    const r = toRow(row);
    return {
      found: true as const,
      request: {
        id: r.id,
        created_at: fmtDate(String(r.created_at)),
        name: r.name,
        category: r.category,
        items: r.items,
        details: r.details,
      },
    };
  });
