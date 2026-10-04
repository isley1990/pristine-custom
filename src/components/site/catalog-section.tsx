import { Link } from "@tanstack/react-router";

import type { ProductCard } from "@/lib/api/products.functions";
import { categories } from "@/lib/categories";

import { Chevron, StarIcon } from "./icons";
import { ProductGrid } from "./product-card";

/** Category tiles that link to crawlable category pages. */
export function CategoryGrid({ counts }: { counts?: Record<string, number> }) {
  return (
    <nav aria-label="Part categories" className="pc-cats">
      {categories.map((c) => (
        <Link className="pc-cat" key={c.id} params={{ category: c.id }} to="/shop/$category">
          <img alt="" className="pc-cat__img" decoding="async" height={64} loading="lazy" src={c.image} width={64} />
          <span className="pc-cat__text">
            <span className="pc-cat__name">{c.name}</span>
            {counts?.[c.id] ? <span className="pc-cat__count">{counts[c.id]} parts</span> : null}
          </span>
          <Chevron />
        </Link>
      ))}
      <Link className="pc-cat pc-cat--all" to="/shop">
        <span className="pc-cat__star"><StarIcon /></span>
        <span className="pc-cat__text">
          <span className="pc-cat__name">All categories</span>
        </span>
        <Chevron />
      </Link>
    </nav>
  );
}

export function CatalogSection({ counts, featured }: { counts: Record<string, number>; featured: ProductCard[] }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <section id="catalog" className="pc-section" aria-labelledby="catalog-title">
      <div className="pc-wrap">
        <header className="pc-catalog__head">
          <h2 id="catalog-title" className="pc-display">
            Shop by <span className="pc-red-text">category</span>
          </h2>
          <p className="pc-lede">
            {total > 0 ? `${total.toLocaleString("en-US")} trailer parts` : "Trailer parts"} across 15 categories. Search by part number,
            add to cart and send it for a fitment check and final quote.
          </p>
        </header>
        <CategoryGrid counts={counts} />
        {featured.length ? (
          <div className="pc-featured">
            <div className="pc-featured__head">
              <h3 className="pc-panel__title">Ready to bolt on</h3>
              <Link className="pc-cta-fit" to="/shop">
                <span className="pc-slash" aria-hidden="true" />
                <span className="pc-cta-fit__label">Browse all parts</span>
              </Link>
            </div>
            <ProductGrid items={featured} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
