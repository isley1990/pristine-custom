import { useEffect } from "react";

import { formatPrice } from "@/lib/categories";

import { useCart } from "./cart-context";
import { Close } from "./icons";

function CheckoutActions({ onGo, canPay }: { onGo: () => void; canPay: boolean }) {
  return (
    <>
      {canPay ? (
        <a className="pc-cta-buy pc-drawer__pay" href="/checkout" onClick={onGo}>
          Checkout
        </a>
      ) : null}
      <a className="pc-cta-checkout" href="/#quote" onClick={onGo}>
        <span>{canPay ? "Or request a quote" : "Get a quote"}</span>
        <span className="pc-cta-checkout__bars" aria-hidden="true" />
      </a>
    </>
  );
}

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

  return (
    <div className="pc-drawer" data-open={open ? "true" : undefined} inert={!open}>
      <button aria-label="Close cart" className="pc-drawer__scrim" onClick={() => setOpen(false)} tabIndex={-1} type="button" />
      <aside aria-label="Cart" className="pc-drawer__panel pc-glass" role="dialog" aria-modal="true">
        <div className="pc-drawer__head">
          <h2>Your cart <span>({count})</span></h2>
          <button aria-label="Close cart" className="pc-drawer__close" onClick={() => setOpen(false)} type="button">
            <Close />
          </button>
        </div>
        {items.length === 0 ? (
          <div className="pc-drawer__empty">
            <p>Your cart is empty.</p>
            <a href="/shop" onClick={() => setOpen(false)}>Shop parts</a>
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
              <p className="pc-drawer__sub"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p>
              <p className="pc-drawer__note">
                {unpriced > 0 ? `${unpriced} item${unpriced === 1 ? "" : "s"} without a listed price — request a quote for ${unpriced === 1 ? "it" : "them"}. ` : ""}
                Before delivery and tax. Check out in a minute and pay at pickup or by phone.
              </p>
              <CheckoutActions canPay={items.length > unpriced} onGo={() => setOpen(false)} />
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
