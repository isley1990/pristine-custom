import { useEffect } from "react";

import { formatPrice } from "@/lib/catalog";

import { useCart } from "./cart-context";
import { Close } from "./icons";

function CheckoutQuote({ onGo }: { onGo: () => void }) {
  return (
    <a className="pc-cta-checkout" href="/#quote" onClick={onGo}>
      <span>Get a quote</span>
      <span className="pc-cta-checkout__bars" aria-hidden="true" />
    </a>
  );
}

export function CartDrawer() {
  const { items, subtotal, count, setQty, remove, open, setOpen } = useCart();

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
            <a href="/#catalog" onClick={() => setOpen(false)}>Shop parts</a>
          </div>
        ) : (
          <>
            <ul className="pc-drawer__items">
              {items.map((i) => (
                <li key={i.sku}>
                  <div className="pc-drawer__info">
                    <p className="pc-drawer__name">{i.name}</p>
                    <p className="pc-drawer__sku">{i.sku} · {formatPrice(i.price)}</p>
                    <button className="pc-drawer__remove" onClick={() => remove(i.sku)} type="button">Remove</button>
                  </div>
                  <div className="pc-qty">
                    <button aria-label={`Decrease ${i.name}`} disabled={i.qty <= 1} onClick={() => setQty(i.sku, i.qty - 1)} type="button">-</button>
                    <span aria-live="polite">{i.qty}</span>
                    <button aria-label={`Increase ${i.name}`} onClick={() => setQty(i.sku, i.qty + 1)} type="button">+</button>
                  </div>
                  <p className="pc-drawer__line">{formatPrice(i.qty * i.price)}</p>
                </li>
              ))}
            </ul>
            <div className="pc-drawer__foot">
              <p className="pc-drawer__sub"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></p>
              <p className="pc-drawer__note">Before shipping and tax. We confirm fitment and availability before any charge.</p>
              <CheckoutQuote onGo={() => setOpen(false)} />
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
