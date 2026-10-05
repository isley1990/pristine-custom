import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { CategoryGrid } from "@/components/site/catalog-section";
import { Pager } from "@/components/site/pager";
import { ProductGrid } from "@/components/site/product-card";
import { ShopToolbar } from "@/components/site/shop-toolbar";
import { listProducts } from "@/lib/api/products.functions";
import { categoryById, catThumb } from "@/lib/categories";
import { fitmentTip } from "@/lib/product-specs";
import { abs, breadcrumbJsonLd, pageHead } from "@/lib/site";

type Sort = "relevance" | "name" | "price-asc" | "price-desc";

const search = z.object({
  q: z.string().max(80).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
  sort: z.enum(["relevance", "name", "price-asc", "price-desc"]).optional().catch(undefined),
});

export const Route = createFileRoute("/shop/$category")({
  validateSearch: search,
  loaderDeps: ({ search: s }) => ({ q: s.q, page: s.page ?? 1, sort: s.sort ?? "relevance" }),
  loader: async ({ params, deps }) => {
    const cat = categoryById(params.category);
    if (!cat) throw notFound();
    const list = await listProducts({ data: { ...deps, category: cat.id } });
    return { cat, list, q: deps.q ?? "", page: deps.page, sort: deps.sort };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { cat, list, page, q } = loaderData;
    const path = `/shop/${cat.id}${page > 1 ? `?page=${page}` : ""}`;
    return pageHead({
      title: `${cat.name} for Trailers${page > 1 ? `, Page ${page}` : ""}`,
      description: `${cat.blurb} ${list.total} parts with online checkout, local delivery or free pickup in Vero Beach, FL.`,
      path,
      image: cat.image,
      noindex: !!q,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Shop", path: "/shop" },
          { name: cat.name, path: `/shop/${cat.id}` },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${cat.name} for Trailers`,
          description: cat.intro,
          url: abs(path),
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: list.total,
            itemListElement: list.items.map((p, i) => ({
              "@type": "ListItem",
              position: (page - 1) * 24 + i + 1,
              url: abs(`/product/${p.slug}`),
              name: p.name,
            })),
          },
        },
      ],
    });
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { cat, list, q, page, sort } = Route.useLoaderData();
  const navigate = useNavigate({ from: "/shop/$category" });
  return (
    <main className="pc-subpage pc-after">
      <div className="pc-wrap">
        <nav aria-label="Breadcrumb" className="pc-crumbs">
          <a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/shop">Shop</a> <span aria-hidden="true">/</span>{" "}
          <span aria-current="page">{cat.name}</span>
        </nav>
        <header className="pc-cathero pc-glass">
          <img alt="" className="pc-cathero__img" fetchPriority="high" height={160} src={catThumb(cat.image)} width={160} />
          <div>
            <h1 className="pc-display">{cat.name}</h1>
            <p className="pc-lede">{cat.intro}</p>
            {fitmentTip(cat.id) ? <p className="pc-cathero__tip"><strong>Before you order:</strong> {fitmentTip(cat.id)}.</p> : null}
          </div>
        </header>
        <ShopToolbar
          onSearch={(nq) => navigate({ search: { q: nq || undefined } })}
          onSort={(ns) => navigate({ search: (s) => ({ ...s, sort: ns === "relevance" ? undefined : (ns as Sort), page: undefined }) })}
          placeholder={`Search ${cat.name.toLowerCase()}`}
          q={q}
          sort={sort}
          total={list.total}
        />
        {list.items.length ? (
          <>
            <h2 className="pc-sr">{cat.name} parts</h2>
            <ProductGrid eagerCount={4} items={list.items} />
          </>
        ) : (
          <div className="pc-empty pc-glass">
            <h2>No parts found</h2>
            <p>Try another search, or ask us in a quote request and we'll source it.</p>
          </div>
        )}
        <Pager
          page={page}
          pages={list.pages}
          params={{ category: cat.id }}
          search={{ q: q || undefined, sort: sort === "relevance" ? undefined : sort }}
          to="/shop/$category"
        />
        <section aria-labelledby="other-cats" className="pc-othercats">
          <h2 className="pc-panel__title" id="other-cats">Other categories</h2>
          <CategoryGrid />
        </section>
      </div>
    </main>
  );
}
