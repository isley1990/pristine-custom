import { DEFAULT_SETTINGS, type StoreSettings } from "./store-config";
import { db } from "./supabase.server";

const KEY = "store";
const SECRET_KEY = "paypal_secret";

function merge(saved: Partial<StoreSettings> | null): StoreSettings {
  const s = saved ?? {};
  return {
    store: { ...DEFAULT_SETTINGS.store, ...(s.store ?? {}) },
    delivery: { ...DEFAULT_SETTINGS.delivery, ...(s.delivery ?? {}) },
    tax: { ...DEFAULT_SETTINGS.tax, ...(s.tax ?? {}) },
    payments: { ...DEFAULT_SETTINGS.payments, ...(s.payments ?? {}) },
  };
}

export async function loadSettings(): Promise<StoreSettings> {
  const { data } = await db().from("pristine_settings").select("value").eq("key", KEY).maybeSingle();
  const s = merge((data?.value as Partial<StoreSettings>) ?? null);
  // Environment variables, when set, win over the admin values.
  if (process.env.PAYPAL_CLIENT_ID) s.payments.clientId = process.env.PAYPAL_CLIENT_ID;
  if (process.env.PAYPAL_MODE === "live" || process.env.PAYPAL_MODE === "sandbox") s.payments.mode = process.env.PAYPAL_MODE;
  if (process.env.STRIPE_PUBLISHABLE_KEY) s.payments.stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  return s;
}

export async function saveSettings(s: StoreSettings) {
  const { error } = await db().from("pristine_settings").upsert({ key: KEY, value: s, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function loadPaypalSecret(): Promise<string> {
  if (process.env.PAYPAL_CLIENT_SECRET) return process.env.PAYPAL_CLIENT_SECRET;
  const { data } = await db().from("pristine_settings").select("value").eq("key", SECRET_KEY).maybeSingle();
  const v = data?.value as { secret?: string } | null;
  return v?.secret ?? "";
}

export async function savePaypalSecret(secret: string) {
  const { error } = await db().from("pristine_settings").upsert({ key: SECRET_KEY, value: { secret }, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

/* ---------- Stripe secrets (never sent to the browser) ---------- */
async function loadSecretValue(key: string): Promise<string> {
  const { data } = await db().from("pristine_settings").select("value").eq("key", key).maybeSingle();
  return ((data?.value as { secret?: string } | null)?.secret ?? "").trim();
}
async function saveSecretValue(key: string, secret: string) {
  const { error } = await db().from("pristine_settings").upsert({ key, value: { secret }, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
export const loadStripeSecret = async () => process.env.STRIPE_SECRET_KEY || (await loadSecretValue("stripe_secret"));
export const saveStripeSecret = (s: string) => saveSecretValue("stripe_secret", s);
export const loadStripeWebhookSecret = async () => process.env.STRIPE_WEBHOOK_SECRET || (await loadSecretValue("stripe_webhook_secret"));
export const saveStripeWebhookSecret = (s: string) => saveSecretValue("stripe_webhook_secret", s);
export const stripeEnv = () => ({
  publishable: !!process.env.STRIPE_PUBLISHABLE_KEY,
  secret: !!process.env.STRIPE_SECRET_KEY,
  webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
});

export const secretFromEnv = () => !!process.env.PAYPAL_CLIENT_SECRET;
export const clientIdFromEnv = () => !!process.env.PAYPAL_CLIENT_ID;
