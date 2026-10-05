import { Link } from "@tanstack/react-router";

import type { ProductCard as Card } from "@/lib/api/products.functions";
import { formatPrice } from "@/lib/categories";

import { AddToCart } from "./ctas";

export function ProductCard({ product, eager = false }: { product: Card; eager?: boolean }) {
  return (
    <li className="pc-pcard">
      <Link className="pc-pcard__media" params={{ slug: product.slug }} to="/product/$slug" aria-label={product.name}>
        <img alt={product.name} decoding="async" height={240} loading={eager ? "eager" : "lazy"} src={product.thumb ?? product.image} width={240} />
      </Link>
      <div className="pc-pcard__body">
        <p className="pc-pcard__meta">
          #{product.partNumber}
          {product.brand ? ` · ${product.brand}` : ""}
        </p>
        <h3 className="pc-pcard__name">
          <Link params={{ slug: product.slug }} to="/product/$slug">
            {product.name}
          </Link>
        </h3>
        <div className="pc-pcard__row">
          <p className={product.price == null ? "pc-pcard__price pc-pcard__price--call" : "pc-pcard__price"}>
            {product.price == null ? "Call for price" : formatPrice(product.price)}
          </p>
          <AddToCart product={product} />
        </div>
        {!product.inStock ? <p className="pc-pcard__stock">Special order</p> : null}
      </div>
    </li>
  );
}

export function ProductGrid({ items, eagerCount = 0 }: { items: Card[]; eagerCount?: number }) {
  return (
    <ul className="pc-pgrid">
      {items.map((p, i) => (
        <ProductCard eager={i < eagerCount} key={p.partNumber} product={p} />
      ))}
    </ul>
  );
}
