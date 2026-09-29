import { useEffect, useState } from "react";

import type { CatalogProduct } from "@/lib/catalog";

import { useCart } from "./cart-context";
import { ArrowRight, Check, Plus } from "./icons";

export function HeroQuoteButton() {
  return (
    <a className="pc-cta-hero" href="#quote">
      <span>Get a quote</span>
    </a>
  );
}

export function BrowseButton() {
  return (
    <a className="pc-cta-browse" href="#catalog">
      <span>Browse catalog</span>
      <ArrowRight />
    </a>
  );
}

export function ClosingQuoteButton() {
  return (
    <a className="pc-cta-close" href="#quote">
      <span>Get a quote</span>
      <span className="pc-cta-close__chev" aria-hidden="true">
        <span>&gt;</span>
        <span>&gt;</span>
        <span>&gt;</span>
      </span>
    </a>
  );
}

export function FitmentLink() {
  return (
    <a className="pc-cta-fit" href="/how-to">
      <span className="pc-slash" aria-hidden="true" />
      <span className="pc-cta-fit__label">Read the how-to guides</span>
    </a>
  );
}

/** AddToCart: flips to a confirmation state for a moment after each add. */
export function AddToCart({ product, compact = false }: { product: CatalogProduct; compact?: boolean }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setDone(false), 1200);
    return () => window.clearTimeout(t);
  }, [done]);
  return (
    <button
      aria-label={`Add ${product.name} to cart`}
      className={compact ? "pc-add-cart pc-add-cart--compact" : "pc-add-cart"}
      data-done={done ? "true" : undefined}
      onClick={() => {
        add(product);
        setDone(true);
      }}
      type="button"
    >
      {done ? <Check /> : <Plus />}
      {compact ? null : <span>{done ? "Added" : "Add to cart"}</span>}
    </button>
  );
}
