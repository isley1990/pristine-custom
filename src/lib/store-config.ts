/** PayPal / Venmo are switched off for now (cards go through Stripe). Flip to true to bring PayPal back. */
export const ONLINE_PAYMENTS = false;

export const STRIPE_PK_RE = /^pk_(test|live)_[A-Za-z0-9]{20,}$/;
export const STRIPE_SK_RE = /^(sk|rk)_(test|live)_[A-Za-z0-9]{20,}$/;
export const STRIPE_WH_RE = /^whsec_[A-Za-z0-9]{20,}$/;
export const stripeKeyMode = (k: string) => (/_live_/.test(k) ? "live" : /_test_/.test(k) ? "test" : null);

/** Checkout, delivery and tax settings. Shared by server and admin UI (no secrets here). */
export type DeliverySettings = {
  enabled: boolean;
  pickupEnabled: boolean;
  baseFee: number; // charged on every delivery
  includedMiles: number; // miles covered by the base fee
  ratePerMile: number; // after included miles, up to tierBreakMiles
  tierBreakMiles: number; // longer trips switch to tierRatePerMile
  tierRatePerMile: number;
  minFee: number;
  maxMiles: number; // beyond this, delivery is not offered
  roadFactor: number; // straight-line miles x factor ~= road miles
  freeOver: number; // order subtotal for free delivery (0 = off)
  freeWithinMiles: number; // free delivery only applies inside this radius
};

export type TaxSettings = { rate: number; taxDelivery: boolean };

export type PaymentSettings = {
  paypalEnabled: boolean;
  venmoEnabled: boolean;
  cardEnabled: boolean;
  payLaterEnabled: boolean; // "Pay at pickup / we call you"
  mode: "sandbox" | "live";
  clientId: string;
  /** Card payments through Stripe (Payment Element on the checkout page). */
  stripeEnabled: boolean;
  stripePublishableKey: string;
};

export type StoreSettings = {
  store: { name: string; address: string; lat: number; lng: number; pickupHours: string };
  delivery: DeliverySettings;
  tax: TaxSettings;
  payments: PaymentSettings;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  store: {
    name: "Pristine Custom Wheels & Trailer Parts",
    address: "1621 91st Ct, Vero Beach, FL 32966",
    lat: 27.632454,
    lng: -80.514558,
    pickupHours: "Mon–Fri 9am–5pm, Sat by appointment",
  },
  delivery: {
    enabled: true,
    pickupEnabled: true,
    baseFee: 15,
    includedMiles: 10,
    ratePerMile: 1.75,
    tierBreakMiles: 60,
    tierRatePerMile: 2.25,
    minFee: 15,
    maxMiles: 150,
    roadFactor: 1.3,
    freeOver: 500,
    freeWithinMiles: 25,
  },
  tax: { rate: 7, taxDelivery: false },
  payments: { paypalEnabled: false, venmoEnabled: true, cardEnabled: true, payLaterEnabled: true, mode: "sandbox", clientId: "", stripeEnabled: false, stripePublishableKey: "" },
};

const R = 3958.8; // earth radius, miles
export function straightMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const money = (n: number) => Math.round(n * 100) / 100;

export type DeliveryQuote =
  | { available: true; miles: number; fee: number; free: boolean; breakdown: string }
  | { available: false; miles: number; reason: string };

/** Distance-based delivery fee: base + per mile (two tiers), minimum, free-over threshold, max radius. */
export function deliveryFee(d: DeliverySettings, roadMiles: number, subtotal: number): DeliveryQuote {
  const miles = Math.round(roadMiles * 10) / 10;
  if (!d.enabled) return { available: false, miles, reason: "Delivery is not available right now. Choose store pickup." };
  if (miles > d.maxMiles) return { available: false, miles, reason: `That address is about ${miles} miles away. We deliver up to ${d.maxMiles} miles. Call us for freight options or choose pickup.` };
  if (d.freeOver > 0 && subtotal >= d.freeOver && miles <= d.freeWithinMiles) {
    return { available: true, miles, fee: 0, free: true, breakdown: `Free delivery on orders over $${d.freeOver} within ${d.freeWithinMiles} miles` };
  }
  const band1 = Math.max(0, Math.min(miles, d.tierBreakMiles) - d.includedMiles);
  const band2 = Math.max(0, miles - Math.max(d.tierBreakMiles, d.includedMiles));
  const raw = d.baseFee + band1 * d.ratePerMile + band2 * d.tierRatePerMile;
  const fee = money(Math.max(raw, d.minFee));
  const parts = [`$${d.baseFee.toFixed(2)} base (first ${d.includedMiles} mi)`];
  if (band1 > 0) parts.push(`${band1.toFixed(1)} mi × $${d.ratePerMile.toFixed(2)}`);
  if (band2 > 0) parts.push(`${band2.toFixed(1)} mi × $${d.tierRatePerMile.toFixed(2)}`);
  if (raw < d.minFee) parts.push(`minimum $${d.minFee.toFixed(2)}`);
  return { available: true, miles, fee, free: false, breakdown: parts.join(" + ") };
}

export const orderNumber = (id: number) => `PC-${1000 + id}`;
export const parseOrderNumber = (s: string) => {
  const m = /^\s*PC-?(\d+)\s*$/i.exec(s);
  return m ? Number(m[1]) - 1000 : null;
};
export const roundMoney = money;
