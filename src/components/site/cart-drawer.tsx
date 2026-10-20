import { useEffect } from "react";

import { formatPrice } from "@/lib/categories";
import { SITE } from "@/lib/site";

import { useCart } from "./cart-context";
import { Close } from "./icons";

/** The quote list: customers collect parts here, then send them as a quote request, call, or email. No online payment. */
export function CartDrawer() {
  const { items, subtotal, count, unpriced, setQty, remove, open, setOpen } = useCart();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  const emailBody = [
    "Hi Pristine Custom, please send me a quote for:",
    "",
    ...items.map((i) => `${i.qty} x ${i.name} (#${i.sku})`),
    "",
    "Name:",
    "Phone:",
    "Delivery or pickup:",
  ].join("\n");
  const mailHref = `mailto:${SITE.email}?subject=${encodeURIComponent("Quote request")}&body=${encodeURIComponent(emailBody)}`;

  return (
    <div className="pc-drawer" data-open={open ? "true" : undefined} inert={!open}>
      <button aria-label="Close quote list" className="pc-drawer__scrim" onClick={() => setOpen(false)} tabIndex={-1} type="button" />
      <aside aria-label="Quote list" className="pc-drawer__panel pc-glass" role="dialog" aria-modal="true">
        <div className="pc-drawer__head">
          <h2>Quote list <span>({count})</span></h2>
          <button aria-label="Close quote list" className="pc-drawer__close" onClick={() => setOpen(false)} type="button">
            <Close />
          </button>
        </div>
        {items.length === 0 ? (
          <div className="pc-drawer__empty">
            <p>Your quote list is empty.</p>
            <a href="/shop" onClick={() => setOpen(false)}>Browse parts</a>
          </div>
        ) : (
          <>
            <ul className="pc-drawer__items">
              {items.map((i) => (
                <li key={i.sku}>
                  <div className="pc-drawer__info">
                    <a className="pc-drawer__name" href={`/product/${i.slug}`} onClick={() => setOpen(false)}>{i.name}</a>
                    <p className="pc-drawer__sku">#{i.sku} · {i.price == null ? "Call for price" : formatPrice(i.price)}</p>
                    <button className="pc-drawer__remove" onClick={() => remove(i.sku)} type="button">Remove</button>
                  </div>
                  <div className="pc-qty">
                    <button aria-label={`Decrease ${i.name}`} disabled={i.qty <= 1} onClick={() => setQty(i.sku, i.qty - 1)} type="button">-</button>
                    <span aria-live="polite">{i.qty}</span>
                    <button aria-label={`Increase ${i.name}`} onClick={() => setQty(i.sku, i.qty + 1)} type="button">+</button>
                  </div>
                  <p className="pc-drawer__line">{i.price == null ? "TBD" : formatPrice(i.qty * i.price)}</p>
                </li>
              ))}
            </ul>
            <div className="pc-drawer__foot">
              <p className="pc-drawer__sub"><span>Estimated</span><strong>{formatPrice(subtotal)}</strong></p>
              <p className="pc-drawer__note">
                {unpriced > 0 ? `${unpriced} item${unpriced === 1 ? "" : "s"} without a listed price. ` : ""}
                List prices before delivery and tax. We confirm fitment and send your final price by phone or email. Nothing is charged online.
              </p>
              <a className="pc-cta-buy pc-drawer__pay" href="/#quote" onClick={() => setOpen(false)}>
                Request a quote
              </a>
              <a className="pc-cta-checkout" href={SITE.phoneHref}>
                <span>Call {SITE.phoneDisplay}</span>
                <span className="pc-cta-checkout__bars" aria-hidden="true" />
              </a>
              <p className="pc-drawer__note" style={{ textAlign: "center" }} lang="es">
                Para Español: <a href={SITE.phoneEsHref}>{SITE.phoneEsDisplay}</a>
              </p>
              <p className="pc-drawer__note" style={{ textAlign: "center" }}>
                Or <a href={mailHref}>email this list</a> to {SITE.email}
              </p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
