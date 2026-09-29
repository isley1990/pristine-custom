import { useEffect, useState } from "react";

import { allProducts, categories, formatPrice, searchProducts } from "@/lib/catalog";

import { AddToCart } from "./ctas";
import { Chevron, Close, StarIcon } from "./icons";

type Detail = { category?: string; q?: string };

export function CatalogSection() {
  const [active, setActive] = useState<string>("tires-wheels");
  const [q, setQ] = useState("");

  useEffect(() => {
    const apply = (d: Detail) => {
      if (d.category) setActive(d.category);
      setQ(d.q ?? "");
    };
    const params = new URLSearchParams(window.location.search);
    const initial = { category: params.get("cat") ?? undefined, q: params.get("q") ?? undefined };
    if (initial.category || initial.q) apply({ category: initial.category ?? "all", q: initial.q });
    const onEvt = (e: Event) => apply((e as CustomEvent<Detail>).detail ?? {});
    window.addEventListener("pc:catalog", onEvt);
    return () => window.removeEventListener("pc:catalog", onEvt);
  }, []);

  const cat = categories.find((c) => c.id === active);
  const base = active === "all" || !cat ? allProducts : allProducts.filter((p) => p.categoryId === active);
  const products = q ? searchProducts(q).filter((p) => base.includes(p)) : base;
  const title = q ? `Results for "${q}"` : cat ? cat.name : "All categories";
  const blurb = q
    ? `${products.length} part${products.length === 1 ? "" : "s"} found${cat && active !== "all" ? ` in ${cat.name}` : ""}.`
    : cat
      ? cat.blurb
      : `${allProducts.length} parts across ${categories.length} categories.`;

  const pick = (id: string) => {
    setActive(id);
    setQ("");
    const panel = document.getElementById("catalog-panel");
    if (panel && window.matchMedia("(max-width: 980px)").matches) {
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section id="catalog" className="pc-section" aria-labelledby="catalog-title">
      <div className="pc-wrap">
        <header className="pc-catalog__head">
          <h2 id="catalog-title" className="pc-display">
            Shop by <span className="pc-red-text">category</span>
          </h2>
          <p className="pc-lede">Every part for your trailer, boat rig or tow setup. Add to cart, then send it for a fitment check and final quote.</p>
        </header>

        <div className="pc-cats" role="tablist" aria-label="Part categories">
          {categories.map((c) => (
            <button
              aria-controls="catalog-panel"
              aria-selected={active === c.id}
              className="pc-cat"
              key={c.id}
              onClick={() => pick(c.id)}
              role="tab"
              type="button"
            >
              <img alt="" className="pc-cat__img" decoding="async" height={64} loading="lazy" src={c.image} width={64} />
              <span className="pc-cat__name">{c.name}</span>
              <Chevron />
            </button>
          ))}
          <button
            aria-controls="catalog-panel"
            aria-selected={active === "all"}
            className="pc-cat pc-cat--all"
            onClick={() => pick("all")}
            role="tab"
            type="button"
          >
            <span className="pc-cat__star"><StarIcon /></span>
            <span className="pc-cat__name">All categories</span>
            <Chevron />
          </button>
        </div>

        <div id="catalog-panel" className="pc-panel pc-glass" role="tabpanel" aria-live="polite">
          <div className="pc-panel__intro">
            <h3 className="pc-panel__title">{title}</h3>
            <p>{blurb}</p>
            {q ? (
              <button className="pc-panel__clear" onClick={() => setQ("")} type="button">
                <Close /> Clear search
              </button>
            ) : null}
          </div>
          {products.length === 0 ? (
            <p className="pc-panel__empty">No parts match that search. Try a part number, a size like 15x6, or a category name.</p>
          ) : (
            <ul className="pc-products">
              {products.map((p) => (
                <li className="pc-product" key={p.sku}>
                  <img alt="" className="pc-product__img" height={72} loading="lazy" src={p.image} width={72} />
                  <div className="pc-product__body">
                    <p className="pc-product__name">{p.name}</p>
                    <p className="pc-product__spec">{p.sku} · {p.spec}</p>
                    <div className="pc-product__row">
                      <p className="pc-product__price">{formatPrice(p.price)}</p>
                      <AddToCart product={p} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
