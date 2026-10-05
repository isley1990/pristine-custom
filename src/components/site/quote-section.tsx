import { useState, type FormEvent } from "react";
import { friendlyError } from "@/lib/errors";

import { submitQuote } from "@/lib/api/quote.functions";

import { Close } from "./icons";
import { formatPrice } from "@/lib/categories";

import { useCart } from "./cart-context";

const CATS = [
  { id: "Wheels", icon: "/assets/icons/sm/wheel.webp" },
  { id: "Tires", icon: "/assets/icons/sm/measure.webp" },
  { id: "Trailer parts", icon: "/assets/icons/sm/axle.webp" },
  { id: "Accessories", icon: "/assets/icons/sm/install.webp" },
] as const;

type Cat = (typeof CATS)[number]["id"];

function SubmitQuote({ busy }: { busy: boolean }) {
  return (
    <button className="pc-cta-submit" disabled={busy} type="submit">
      <span>{busy ? "Sending" : "Send request"}</span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function QuoteSection() {
  const { items, remove, clear, subtotal } = useCart();
  const [requestId, setRequestId] = useState<number | null>(null);
  const [category, setCategory] = useState<Cat>("Wheels");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Add your name so we know who to reply to.");
    if (!phone.trim() && !email.trim()) return setError("Add a phone number or an email so we can reply.");
    setStatus("sending");
    try {
      const res = await submitQuote({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          category,
          details: details.trim(),
          items: items.map((i) => `${i.qty} x ${i.name} (#${i.sku}) ${i.price == null ? "call for price" : formatPrice(i.price)}`.slice(0, 160)),
          website,
        },
      });
      setRequestId(res.id ?? null);
      setStatus("done");
      clear();
    } catch (err) {
      setStatus("idle");
      setError(friendlyError(err));
    }
  };

  return (
    <section id="quote" className="pc-section" aria-labelledby="quote-title">
      <div className="pc-wrap pc-quote__grid">
        <div>
          <img alt="" className="pc-quote__badge" src="/assets/brand/logo_badge-260.webp" width={170} height={136} />
          <h2 id="quote-title" className="pc-display">
            Tell us what <span className="pc-red-text">you tow.</span>
          </h2>
          <p className="pc-lede">
            Wheels, tires or a full axle swap. Send the details and we reply with parts that fit and a price.
          </p>
          <div className="pc-list pc-glass">
            <h3 className="pc-list__title">Your cart</h3>
            {items.length === 0 ? (
              <p className="pc-list__empty">Your cart is empty. Add parts from the catalog, or just describe what you need in the form.</p>
            ) : (
              <>
                <ul className="pc-list__items">
                  {items.map((i) => (
                    <li className="pc-list__chip" key={i.sku}>
                      {i.qty} x {i.name}
                      <button aria-label={`Remove ${i.name}`} onClick={() => remove(i.sku)} type="button">
                        <Close />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="pc-list__sub">Subtotal <strong>{formatPrice(subtotal)}</strong></p>
              </>
            )}
          </div>
        </div>

        {status === "done" ? (
          <div className="pc-done pc-glass" role="status">
            <h3>{requestId ? `Request #${requestId} received.` : "Request received."}</h3>
            <p>
              Thanks, {name.trim().split(" ")[0]}. We will confirm fitment and reply by phone or email with final pricing.
              {requestId && email ? " You can check it any time in My Account with your email and this number." : ""}
            </p>
            <button onClick={() => { setStatus("idle"); setDetails(""); }} type="button">Send another request</button>
          </div>
        ) : (
          <form className="pc-form pc-glass" noValidate onSubmit={onSubmit}>
            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="pc-field__legend">Part category</legend>
              <div className="pc-seg" style={{ marginTop: "0.6rem" }}>
                {CATS.map((c) => (
                  <button aria-pressed={category === c.id} key={c.id} onClick={() => setCategory(c.id)} type="button">
                    <img alt="" height={30} src={c.icon} width={30} />
                    {c.id}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="pc-row">
              <div className="pc-field">
                <label htmlFor="q-name">Name</label>
                <input autoComplete="name" id="q-name" onChange={(e) => setName(e.target.value)} placeholder="Full name" required value={name} />
              </div>
              <div className="pc-field">
                <label htmlFor="q-phone">Phone</label>
                <input autoComplete="tel" id="q-phone" inputMode="tel" onChange={(e) => setPhone(e.target.value)} placeholder="Best number to reach you" type="tel" value={phone} />
              </div>
            </div>
            <div className="pc-field">
              <label htmlFor="q-email">Email</label>
              <input autoComplete="email" id="q-email" onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email" value={email} />
            </div>
            <div className="pc-field">
              <label htmlFor="q-details">Details</label>
              <textarea
                id="q-details"
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Trailer type, bolt pattern, tire size, axle rating, anything you know"
                value={details}
              />
            </div>
            <div className="pc-hp" aria-hidden="true">
              <label htmlFor="q-hpx">Leave this empty</label>
              <input autoComplete="off" id="q-hpx" name="pc_hpx" onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} value={website} />
            </div>
            {items.length > 0 ? <p className="pc-hint" style={{ marginTop: "1rem" }}>{items.length} cart item{items.length === 1 ? "" : "s"} will be included.</p> : null}
            {error ? <p className="pc-error" role="alert">{error}</p> : null}
            <SubmitQuote busy={status === "sending"} />
          </form>
        )}
      </div>
    </section>
  );
}
