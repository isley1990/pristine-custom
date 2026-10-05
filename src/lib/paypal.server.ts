import { loadPaypalSecret, loadSettings } from "./store-settings.server";

const base = (mode: "sandbox" | "live") => (mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

export async function paypalConfig() {
  const s = await loadSettings();
  const secret = await loadPaypalSecret();
  return { mode: s.payments.mode, clientId: s.payments.clientId, secret, ready: !!(s.payments.clientId && secret) };
}

export async function paypalToken(cfg: { mode: "sandbox" | "live"; clientId: string; secret: string }) {
  return token(cfg);
}

async function token(cfg: { mode: "sandbox" | "live"; clientId: string; secret: string }) {
  const res = await fetch(`${base(cfg.mode)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("PayPal sign-in failed. Check the client ID, secret and mode in admin settings.");
  const j = (await res.json()) as { access_token: string };
  return j.access_token;
}

async function call<T>(path: string, body?: unknown, requestId?: string): Promise<T> {
  const cfg = await paypalConfig();
  if (!cfg.ready) throw new Error("Online payment is not set up yet.");
  const t = await token(cfg);
  const res = await fetch(`${base(cfg.mode)}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as T & { message?: string; details?: { description?: string }[] };
  if (!res.ok) throw new Error(json.details?.[0]?.description || json.message || `PayPal error ${res.status}`);
  return json;
}

export type PPItem = { name: string; sku: string; unit_amount: { currency_code: "USD"; value: string }; quantity: string };

export async function paypalCreateOrder(args: {
  orderId: number;
  invoice: string;
  items: PPItem[];
  itemTotal: number;
  shipping: number;
  tax: number;
  total: number;
}) {
  const v = (n: number) => n.toFixed(2);
  return call<{ id: string; status: string }>(
    "/v2/checkout/orders",
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: String(args.orderId),
          custom_id: String(args.orderId),
          invoice_id: args.invoice,
          description: "Pristine Custom Wheels & Trailer Parts",
          amount: {
            currency_code: "USD",
            value: v(args.total),
            breakdown: {
              item_total: { currency_code: "USD", value: v(args.itemTotal) },
              shipping: { currency_code: "USD", value: v(args.shipping) },
              tax_total: { currency_code: "USD", value: v(args.tax) },
            },
          },
          items: args.items,
        },
      ],
      application_context: { brand_name: "Pristine Custom", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" },
    },
    `create-${args.invoice}-${Date.now()}`,
  );
}

type Capture = {
  id: string;
  status: string;
  payment_source?: Record<string, { email_address?: string } | undefined>;
  payer?: { email_address?: string };
  purchase_units?: { custom_id?: string; payments?: { captures?: { id: string; status: string; amount: { value: string }; custom_id?: string }[] } }[];
};

export async function paypalCapture(paypalOrderId: string) {
  return call<Capture>(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {}, `capture-${paypalOrderId}`);
}
