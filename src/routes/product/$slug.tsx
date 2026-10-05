import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";

import { useCart } from "@/components/site/cart-context";
import { ProductGrid } from "@/components/site/product-card";
import { getProduct } from "@/lib/api/products.functions";
import { categoryById, formatPrice } from "@/lib/categories";
import { productDescription, productSpecs, fitmentTip } from "@/lib/product-specs";
import { abs, breadcrumbJsonLd, pageHead, SITE } from "@/lib/site";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const res = await getProduct({ data: { slug: params.slug } });
    if (!res.product) throw notFound();
    return { product: res.product, related: res.related };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const p = loaderData.product;
    const cat = categoryById(p.category);
    const specs = productSpecs(p.name, p.brand);
    const about = p.description ?? productDescription(p);
    const desc = `${p.price != null ? `${formatPrice(p.price)} · ` : ""}${p.name}. Part #${p.partNumber}${p.brand ? `, ${p.brand}` : ""}. ${
      specs.filter((x) => x.label !== "Brand").slice(0, 2).map((x) => `${x.label}: ${x.value}`).join(". ")
    }${specs.length > 1 ? ". " : ""}Local delivery or free pickup in Vero Beach, FL.`;
    const product: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      sku: p.partNumber,
      mpn: p.partNumber,
      image: [abs(p.image)],
      description: about,
      category: cat?.name,
      url: abs(`/product/${p.slug}`),
      ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
      ...(specs.length
        ? { additionalProperty: specs.filter((x) => x.label !== "Brand").map((x) => ({ "@type": "PropertyValue", name: x.label, value: x.value })) }
        : {}),
    };
    if (p.price != null) {
      product.offers = {
        "@type": "Offer",
        price: p.price.toFixed(2),
        priceCurrency: "USD",
        availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/BackOrder",
        itemCondition: "https://schema.org/NewCondition",
        url: abs(`/product/${p.slug}`),
        seller: { "@id": `${SITE.url}/#store` },
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: "US",
          returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
          merchantReturnDays: 30,
          returnMethod: ["https://schema.org/ReturnByMail", "https://schema.org/ReturnInStore"],
          returnFees: "https://schema.org/ReturnShippingFees",
        },
      };
    }
    return pageHead({
      title: p.name,
      description: desc,
      path: `/product/${p.slug}`,
      image: p.image,
      jsonLd: [
        product,
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Shop", path: "/shop" },
          ...(cat ? [{ name: cat.name, path: `/shop/${cat.id}` }] : []),
          { name: p.name, path: `/product/${p.slug}` },
        ]),
      ],
    });
  },
  component: ProductPage,
});

function AddWithQty() {
  const { product } = Route.useLoaderData();
  const { add, setOpen } = useCart();
  const [qty, setQty] = useState(1);
  return (
    <div className="pc-buy">
      <div className="pc-qty pc-qty--lg">
        <button aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} type="button">-</button>
        <span aria-live="polite">{qty}</span>
        <button aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(99, q + 1))} type="button">+</button>
      </div>
      <button
        className="pc-cta-buy"
        onClick={() => {
          add(product, qty);
          setOpen(true);
        }}
        type="button"
      >
        Add to cart
      </button>
    </div>
  );
}

function ProductPage() {
  const { product: p, related } = Route.useLoaderData();
  const cat = categoryById(p.category);
  const specs = productSpecs(p.name, p.brand).filter((x) => x.label !== "Brand");
  const about = p.description ?? productDescription(p);
  const tip = fitmentTip(p.category);
  return (
    <main className="pc-subpage pc-after">
      <div className="pc-wrap">
        <nav aria-label="Breadcrumb" className="pc-crumbs">
          <a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/shop">Shop</a>
          {cat ? (
            <>
              {" "}<span aria-hidden="true">/</span>{" "}
              <Link params={{ category: cat.id }} to="/shop/$category">{cat.name}</Link>
            </>
          ) : null}
        </nav>
        <article className="pc-product-page">
          <figure className="pc-product-page__media pc-glass">
            <img alt={p.name} fetchPriority="high" height={720} src={p.image} width={720} />
          </figure>
          <div className="pc-product-page__info">
            {p.brand ? <p className="pc-product-page__brand">{p.brand}</p> : null}
            <h1 className="pc-product-page__title">{p.name}</h1>
            <p className="pc-product-page__sku">Part #{p.partNumber}</p>
            <p className={p.price == null ? "pc-product-page__price pc-product-page__price--call" : "pc-product-page__price"}>
              {p.price == null ? <a href={SITE.phoneHref}>Call for price · {SITE.phoneDisplay}</a> : formatPrice(p.price)}
            </p>
            <AddWithQty />
            <p className="pc-product-page__note">
              {p.price == null
                ? "Add it to your cart and send a quote request. We reply with price, fitment and shipping."
                : "Check out online with local delivery priced by distance, or pick it up free in Vero Beach. We confirm fitment before it ships."}
            </p>
            <dl className="pc-specs">
              <div><dt>Part number</dt><dd>{p.partNumber}</dd></div>
              {p.brand ? <div><dt>Brand</dt><dd>{p.brand}</dd></div> : null}
              {cat ? <div><dt>Category</dt><dd><Link params={{ category: cat.id }} to="/shop/$category">{cat.name}</Link></dd></div> : null}
              <div><dt>Availability</dt><dd>{p.inStock ? "In stock" : "Special order"}</dd></div>
              {specs.map((x) => (
                <div key={x.label}><dt>{x.label}</dt><dd>{x.value}</dd></div>
              ))}
            </dl>
            <div className="pc-product-page__desc">
              <h2>About this part</h2>
              <p>{about}</p>
              {tip && p.description ? <p className="pc-product-page__tip"><strong>Fitment tip:</strong> before you order, {tip}.</p> : null}
            </div>
            <p className="pc-product-page__help">
              Not sure it fits? <a href="/how-to">Check our fitment guides</a> or <a href="/contact">ask us</a>.
            </p>
          </div>
        </article>
        {related.length ? (
          <section aria-labelledby="related" className="pc-related">
            <h2 className="pc-panel__title" id="related">More {cat?.name.toLowerCase() ?? "parts"}</h2>
            <ProductGrid items={related.slice(0, 8)} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
