import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useCart } from "@/components/site/cart-context";
import { PageShell } from "@/components/site/page-shell";
import { captureCheckoutOrder, createCheckoutOrder, getCheckoutConfig, quoteCheckout } from "@/lib/api/checkout.functions";
import { formatPrice } from "@/lib/categories";
import { pageHead, SITE } from "@/lib/site";

export const Route = createFileRoute("/checkout")({
  loader: () => getCheckoutConfig(),
  head: () => pageHead({ title: "Checkout", description: "Pay for your trailer parts with PayPal, Venmo or card. Delivery priced by distance, or free store pickup in Vero Beach.", path: "/checkout", noindex: true }),
  component: Checkout,
});

type Quote = Awaited<ReturnType<typeof quoteCheckout>>;
type Method = "paypal" | "venmo" | "card" | "pay_later";
type Done = { orderNo: string; total: number; method: Method };

/* ---------- PayPal JS SDK (loaded once, only when online payments are on) ---------- */

type PayPalButtons = { isEligible: () => boolean; render: (el: HTMLElement) => Promise<void>; close?: () => void };
type PayPalNS = {
  FUNDING: Record<"PAYPAL" | "VENMO" | "CARD", string>;
  Buttons: (opts: Record<string, unknown>) => PayPalButtons;
};
declare global {
  interface Window {
    paypal?: PayPalNS;
  }
}

let sdkPromise: Promise<PayPalNS> | null = null;
function loadPayPal(clientId: string, buyerCountry: boolean): Promise<PayPalNS> {
  if (window.paypal) return Promise.resolve(window.paypal);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    const params = new URLSearchParams({ "client-id": clientId, currency: "USD", intent: "capture", components: "buttons,funding-eligibility", "enable-funding": "venmo,card" });
    if (buyerCountry) params.set("buyer-country", "US");
    s.src = `https://www.paypal.com/sdk/js?${params}`;
    s.async = true;
    s.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("PayPal did not load")));
    s.onerror = () => {
      sdkPromise = null;
      reject(new Error("PayPal did not load"));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

const STATES = ["FL", "GA", "AL", "SC", "NC", "TN", "MS", "LA", "TX", "VA"];

function Checkout() {
  const cfg = Route.useLoaderData();
  const { items, setQty, remove, clear } = useCart();
  const canPickup = cfg.pickupEnabled;
  const canDeliver = cfg.deliveryEnabled;
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">(canDeliver ? "delivery" : "pickup");
  const [contact, setContact] = useState({ name: "", email: "", phone: "", notes: "" });
  const [addr, setAddr] = useState({ street: "", city: "", state: "FL", zip: "" });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [website, setWebsite] = useState("");

  const cartKey = useMemo(() => items.map((i) => `${i.sku}x${i.qty}`).join(","), [items]);
  const payload = useMemo(
    () => ({ items: items.map((i) => ({ sku: i.sku, qty: i.qty })), fulfillment, address: addr }),
    [items, fulfillment, addr],
  );

  const runQuote = useCallback(async () => {
    if (!items.length) return;
    setQuoting(true);
    try {
      setQuote(await quoteCheckout({ data: payload }));
    } catch {
      setError("Could not price your order. Check your connection and try again.");
    } finally {
      setQuoting(false);
    }
  }, [items.length, payload]);

  // Re-price when the cart or fulfillment changes. Address changes re-price on blur / button.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void runQuote(), [cartKey, fulfillment]);

  const addressReady = fulfillment === "pickup" || (addr.street.trim().length > 3 && /^\d{5}$/.test(addr.zip.trim()));
  const contactError = (): string | null => {
    if (contact.name.trim().length < 2) return "Enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(contact.email.trim())) return "Enter a valid email so we can send your receipt.";
    if (contact.phone.replace(/\D/g, "").length < 10) return "Enter a phone number with area code.";
    if (fulfillment === "delivery" && !addressReady) return "Enter the street address and 5-digit ZIP for delivery.";
    return null;
  };

  /* keep latest form values for PayPal callbacks */
  const live = useRef({ payload, contact, website, contactError, quote });
  live.current = { payload, contact, website, contactError, quote };

  const placeOrder = async (method: Method) => {
    const v = live.current;
    const res = await createCheckoutOrder({ data: { ...v.payload, customer: v.contact, method, website: v.website } });
    return res;
  };

  const finish = (orderNo: string, method: Method) => {
    setDone({ orderNo, total: live.current.quote?.total ?? 0, method });
    clear();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------- PayPal / Venmo / Card buttons ---------- */
  const ppRefs = { paypal: useRef<HTMLDivElement>(null), venmo: useRef<HTMLDivElement>(null), card: useRef<HTMLDivElement>(null) };
  const [ppState, setPpState] = useState<"off" | "loading" | "ready" | "error">(cfg.payments.online ? "loading" : "off");
  const [venmoEligible, setVenmoEligible] = useState(false);
  const blocked = !quote || !!quote.blocked || quoting;

  useEffect(() => {
    if (!cfg.payments.online || done || !items.length) return;
    let cancelled = false;
    const rendered: PayPalButtons[] = [];
    loadPayPal(cfg.payments.clientId, cfg.payments.mode === "sandbox")
      .then((pp) => {
        if (cancelled) return;
        const sources: [keyof typeof ppRefs, string, boolean][] = [
          ["paypal", pp.FUNDING.PAYPAL, cfg.payments.paypal],
          ["venmo", pp.FUNDING.VENMO, cfg.payments.venmo],
          ["card", pp.FUNDING.CARD, cfg.payments.card],
        ];
        for (const [key, funding, enabled] of sources) {
          const el = ppRefs[key].current;
          if (!enabled || !el) continue;
          el.innerHTML = "";
          const btn = pp.Buttons({
            fundingSource: funding,
            style: { layout: "vertical", shape: "rect", height: 46, ...(key === "paypal" ? { color: "gold" } : key === "venmo" ? { color: "blue" } : {}) },
            onClick: (_d: unknown, actions: { reject: () => Promise<void>; resolve: () => Promise<void> }) => {
              const v = live.current;
              const msg = v.contactError() ?? v.quote?.blocked ?? null;
              if (msg) {
                setError(msg);
                return actions.reject();
              }
              setError(null);
              return actions.resolve();
            },
            createOrder: async () => {
              const res = await placeOrder(key === "card" ? "card" : key);
              if (res.kind !== "paypal") throw new Error("Unexpected order type");
              return res.paypalOrderId;
            },
            onApprove: async (d: { orderID: string }) => {
              setBusy(true);
              try {
                const r = await captureCheckoutOrder({ data: { paypalOrderId: d.orderID } });
                finish(r.orderNo, key === "card" ? "card" : key);
              } catch (e) {
                setError((e as Error).message || "Payment could not be completed.");
              } finally {
                setBusy(false);
              }
            },
            onCancel: () => setError("Payment cancelled. Your cart is still here."),
            onError: () => setError("Payment could not start. Check your details and try again, or call us."),
          });
          if (key === "venmo") setVenmoEligible(btn.isEligible());
          if (btn.isEligible()) {
            rendered.push(btn);
            void btn.render(el);
          }
        }
        setPpState("ready");
      })
      .catch(() => !cancelled && setPpState("error"));
    return () => {
      cancelled = true;
      rendered.forEach((b) => b.close?.());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.payments.online, done, items.length === 0]);

  const payLater = async () => {
    const msg = contactError() ?? quote?.blocked ?? null;
    if (msg) return setError(msg);
    setBusy(true);
    setError(null);
    try {
      const res = await placeOrder("pay_later");
      finish(res.orderNo, "pay_later");
    } catch (e) {
      setError((e as Error).message || "Could not place the order.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <PageShell accent="received" lede="Thanks for your order. Keep your order number for tracking." title="Order">
        <div className="pc-done pc-glass pc-co__done">
          <h3>Order {done.orderNo}</h3>
          <p>
            {done.method === "pay_later"
              ? `We will call you to confirm fitment and take payment${done.total ? ` (${formatPrice(done.total)})` : ""}.`
              : `Payment received${done.total ? `: ${formatPrice(done.total)}` : ""}. A receipt is on its way to your email.`}
          </p>
          <p>Track it any time in My Account with your email and {done.orderNo}. Questions? Call or text <a href={SITE.phoneHref}>{SITE.phoneDisplay}</a>.</p>
          <div className="pc-co__doneactions">
            <a className="pc-cta-buy pc-co__btn" href="/account">Track my order</a>
            <a className="pc-cta-browse" href="/shop">Keep shopping</a>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!items.length) {
    return (
      <PageShell accent="out" lede="Your cart is empty. Add parts from the shop to check out." title="Check">
        <div className="pc-empty pc-glass">
          <h2>Nothing to check out yet</h2>
          <p>Search by part number or browse a category.</p>
          <a className="pc-cta-browse" href="/shop">Shop parts</a>
        </div>
      </PageShell>
    );
  }

  const unpricedSet = new Set(quote?.unpriced ?? []);
  const missingSet = new Set(quote?.missing ?? []);
  const set = (k: keyof typeof contact) => (e: { target: { value: string } }) => setContact((c) => ({ ...c, [k]: e.target.value }));
  const setA = (k: keyof typeof addr) => (e: { target: { value: string } }) => setAddr((a) => ({ ...a, [k]: e.target.value }));

  return (
    <PageShell accent="out" lede="Pay with PayPal, Venmo or card. Delivery is priced by distance from our Vero Beach shop, or pick up for free." title="Check">
      <div className="pc-co">
        <div className="pc-co__main">
          <section className="pc-form pc-glass" aria-labelledby="co-contact">
            <h2 className="pc-co__h" id="co-contact"><span>1</span> Contact</h2>
            <div className="pc-field">
              <label htmlFor="co-name">Full name</label>
              <input autoComplete="name" id="co-name" onChange={set("name")} value={contact.name} />
            </div>
            <div className="pc-row">
              <div className="pc-field">
                <label htmlFor="co-email">Email</label>
                <input autoComplete="email" id="co-email" inputMode="email" onChange={set("email")} type="email" value={contact.email} />
              </div>
              <div className="pc-field">
                <label htmlFor="co-phone">Phone</label>
                <input autoComplete="tel" id="co-phone" inputMode="tel" onChange={set("phone")} type="tel" value={contact.phone} />
              </div>
            </div>
            <input aria-hidden="true" autoComplete="off" className="pc-hp" name="website" onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} value={website} />
          </section>

          <section className="pc-form pc-glass" aria-labelledby="co-ful">
            <h2 className="pc-co__h" id="co-ful"><span>2</span> Delivery or pickup</h2>
            <div className="pc-seg pc-seg--text pc-co__seg" role="radiogroup">
              {canDeliver ? (
                <button aria-checked={fulfillment === "delivery"} aria-pressed={fulfillment === "delivery"} onClick={() => setFulfillment("delivery")} role="radio" type="button">Delivery</button>
              ) : null}
              {canPickup ? (
                <button aria-checked={fulfillment === "pickup"} aria-pressed={fulfillment === "pickup"} onClick={() => setFulfillment("pickup")} role="radio" type="button">Store pickup · Free</button>
              ) : null}
            </div>
            {fulfillment === "delivery" ? (
              <>
                <div className="pc-field">
                  <label htmlFor="co-street">Street address</label>
                  <input autoComplete="street-address" id="co-street" onBlur={() => addressReady && runQuote()} onChange={setA("street")} placeholder="123 Main St" value={addr.street} />
                </div>
                <div className="pc-row pc-co__addr">
                  <div className="pc-field">
                    <label htmlFor="co-city">City</label>
                    <input autoComplete="address-level2" id="co-city" onChange={setA("city")} value={addr.city} />
                  </div>
                  <div className="pc-field">
                    <label htmlFor="co-state">State</label>
                    <select autoComplete="address-level1" id="co-state" onChange={setA("state")} value={addr.state}>
                      {STATES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="pc-field">
                    <label htmlFor="co-zip">ZIP</label>
                    <input autoComplete="postal-code" id="co-zip" inputMode="numeric" maxLength={5} onBlur={() => addressReady && runQuote()} onChange={setA("zip")} value={addr.zip} />
                  </div>
                </div>
                <button className="pc-cta-browse pc-co__calc" disabled={!addressReady || quoting} onClick={() => runQuote()} type="button">
                  {quoting ? "Calculating…" : "Calculate delivery"}
                </button>
                {quote?.delivery ? (
                  <p className={quote.delivery.available ? "pc-co__quote" : "pc-error"} role="status">
                    {quote.delivery.available
                      ? <>About <strong>{quote.delivery.miles} miles</strong> from our shop · {quote.delivery.free ? <strong>Free delivery</strong> : <strong>{formatPrice(quote.delivery.fee)}</strong>}<br /><small>{quote.matchedAddress} · {quote.delivery.breakdown}</small></>
                      : quote.delivery.reason}
                  </p>
                ) : (
                  <p className="pc-co__hint">
                    {formatPrice(cfg.delivery.baseFee)} covers the first {cfg.delivery.includedMiles} miles, then {formatPrice(cfg.delivery.ratePerMile)} per mile, up to {cfg.delivery.maxMiles} miles.
                    {cfg.delivery.freeOver > 0 ? ` Free on orders over ${formatPrice(cfg.delivery.freeOver)} within ${cfg.delivery.freeWithinMiles} miles.` : ""}
                  </p>
                )}
              </>
            ) : (
              <p className="pc-co__quote">
                Pick up at <strong>{cfg.store.address}</strong>
                <br />
                <small>{cfg.store.pickupHours}. We call or text when your order is ready.</small>
              </p>
            )}
            <div className="pc-field">
              <label htmlFor="co-notes">Order notes (optional)</label>
              <textarea id="co-notes" onChange={set("notes")} placeholder="Gate code, trailer details, best time to deliver…" rows={3} value={contact.notes} />
            </div>
          </section>

          <section className="pc-form pc-glass" aria-labelledby="co-pay">
            <h2 className="pc-co__h" id="co-pay"><span>3</span> Payment</h2>
            {error ? <p className="pc-error" role="alert">{error}</p> : null}
            {quote?.blocked && !error ? <p className="pc-co__hint">{quote.blocked}</p> : null}
            <div className={blocked ? "pc-co__pay is-blocked" : "pc-co__pay"} aria-busy={busy}>
              {cfg.payments.online ? (
                <>
                  {ppState === "loading" ? <p className="pc-co__hint">Loading secure payment…</p> : null}
                  {ppState === "error" ? <p className="pc-error">Online payment could not load. Refresh the page or use another option.</p> : null}
                  <div ref={ppRefs.paypal} />
                  <div ref={ppRefs.venmo} />
                  <div ref={ppRefs.card} />
                  {ppState === "ready" && cfg.payments.venmo && !venmoEligible ? <p className="pc-co__hint">Venmo appears on supported phones and US accounts.</p> : null}
                </>
              ) : (
                <p className="pc-co__hint">Online payment (PayPal, Venmo, card) is being set up. You can place the order now and pay at pickup or by phone.</p>
              )}
              {cfg.payments.payLater ? (
                <button className="pc-cta-browse pc-co__later" disabled={busy || blocked} onClick={payLater} type="button">
                  {busy ? "Placing order…" : "Place order · pay at pickup or by phone"}
                </button>
              ) : null}
            </div>
            <p className="pc-co__fine">Payments are processed by PayPal. We never see or store your card or bank details. We confirm fitment before your order ships; see our <a href="/shipping-returns">shipping and return policy</a>.</p>
          </section>
        </div>

        <aside className="pc-co__sum pc-glass" aria-label="Order summary">
          <h2 className="pc-co__h">Summary</h2>
          <ul className="pc-co__lines">
            {items.map((i) => {
              const line = quote?.lines.find((l) => l.sku === i.sku);
              const flag = unpricedSet.has(i.sku) ? "Call for price" : missingSet.has(i.sku) ? "Not available" : null;
              return (
                <li key={i.sku} className={flag ? "is-flagged" : undefined}>
                  <img alt="" height={52} src={i.image} width={52} />
                  <div>
                    <a href={`/product/${i.slug}`}>{i.name}</a>
                    <p>#{i.sku} {flag ? <em>· {flag}</em> : null}</p>
                    <div className="pc-co__qty">
                      <button aria-label="Decrease" onClick={() => setQty(i.sku, i.qty - 1)} type="button">−</button>
                      <span>{i.qty}</span>
                      <button aria-label="Increase" onClick={() => setQty(i.sku, i.qty + 1)} type="button">+</button>
                      <button className="pc-co__rm" onClick={() => remove(i.sku)} type="button">Remove</button>
                    </div>
                  </div>
                  <strong>{line ? formatPrice(line.lineTotal) : "—"}</strong>
                </li>
              );
            })}
          </ul>
          {quote && (quote.unpriced.length || quote.missing.length) ? (
            <button className="pc-co__rm pc-co__rmall" onClick={() => [...quote.unpriced, ...quote.missing].forEach((s) => remove(s))} type="button">
              Remove items without a price
            </button>
          ) : null}
          <dl className="pc-co__totals">
            <div><dt>Subtotal</dt><dd>{quote ? formatPrice(quote.subtotal) : "…"}</dd></div>
            <div>
              <dt>{fulfillment === "pickup" ? "Pickup" : "Delivery"}</dt>
              <dd>{fulfillment === "pickup" ? "Free" : quote?.delivery?.available ? (quote.delivery.free ? "Free" : formatPrice(quote.fee)) : "Enter address"}</dd>
            </div>
            <div><dt>Sales tax ({quote?.taxRate ?? cfg.taxRate}%)</dt><dd>{quote ? formatPrice(quote.tax) : "…"}</dd></div>
            <div className="pc-co__total"><dt>Total</dt><dd>{quote ? formatPrice(quote.total) : "…"}</dd></div>
          </dl>
          <p className="pc-co__fine">Need it faster or have a question? Call or text <a href={SITE.phoneHref}>{SITE.phoneDisplay}</a>.</p>
        </aside>
      </div>
    </PageShell>
  );
}
