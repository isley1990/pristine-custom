import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { CategoryGrid } from "@/components/site/catalog-section";
import { Pager } from "@/components/site/pager";
import { ProductGrid } from "@/components/site/product-card";
import { ShopToolbar } from "@/components/site/shop-toolbar";
import { getCategoryCounts, listProducts } from "@/lib/api/products.functions";
import { breadcrumbJsonLd, pageHead } from "@/lib/site";

type Sort = "relevance" | "name" | "price-asc" | "price-desc";

const search = z.object({
  q: z.string().max(80).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
  sort: z.enum(["relevance", "name", "price-asc", "price-desc"]).optional().catch(undefined),
});

export const Route = createFileRoute("/shop/")({
  validateSearch: search,
  loaderDeps: ({ search: s }) => ({ q: s.q, page: s.page ?? 1, sort: s.sort ?? "relevance" }),
  loader: async ({ deps }) => {
    const [list, counts] = await Promise.all([listProducts({ data: deps }), getCategoryCounts()]);
    return { list, counts: counts.counts, q: deps.q ?? "", page: deps.page, sort: deps.sort };
  },
  head: ({ loaderData }) => {
    const q = loaderData?.q;
    const page = loaderData?.page ?? 1;
    return pageHead({
      title: q ? `Search: ${q}` : page > 1 ? `Shop Trailer Parts, Page ${page}` : "Shop Trailer Parts",
      description:
        "Shop trailer wheels and tires, axles, hubs, brakes, lights, leaf springs, couplers, jacks, fenders and boat trailer parts. Search by part number.",
      path: page > 1 ? `/shop?page=${page}` : "/shop",
      noindex: !!q,
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Shop", path: "/shop" }])],
    });
  },
  component: Shop,
});

function Shop() {
  const { list, counts, q, page, sort } = Route.useLoaderData();
  const navigate = useNavigate({ from: "/shop/" });
  return (
    <main className="pc-subpage pc-after">
      <div className="pc-wrap">
        <nav aria-label="Breadcrumb" className="pc-crumbs">
          <a href="/">Home</a> <span aria-hidden="true">/</span> <span aria-current="page">Shop</span>
        </nav>
        <header className="pc-subpage__hero">
          <h1 className="pc-display">
            {q ? (
              <>Results for <span className="pc-red-text">"{q}"</span></>
            ) : (
              <>Shop <span className="pc-red-text">trailer parts</span></>
            )}
          </h1>
          <p className="pc-lede">
            {q
              ? `${list.total} part${list.total === 1 ? "" : "s"} match your search.`
              : "Wheels, tires, axles, brakes, lights and boat trailer parts. Search by part number or pick a category."}
          </p>
        </header>
        {!q ? <CategoryGrid counts={counts} /> : null}
        <ShopToolbar
          onSearch={(nq) => navigate({ search: { q: nq || undefined } })}
          onSort={(ns) => navigate({ search: (s) => ({ ...s, sort: ns === "relevance" ? undefined : (ns as Sort), page: undefined }) })}
          q={q}
          sort={sort}
          total={list.total}
        />
        {list.items.length ? (
          <>
            <h2 className="pc-sr">{q ? `Results for ${q}` : "All trailer parts"}</h2>
            <ProductGrid eagerCount={4} items={list.items} />
          </>
        ) : (
          <div className="pc-empty pc-glass">
            <h2>No parts found</h2>
            <p>Try a part number, a size like ST205/75R15, or a brand like Dexter. Can't find it? Ask us in a quote request and we'll source it.</p>
            <a className="pc-cta-browse" href="/#quote">Get a quote</a>
          </div>
        )}
        <Pager page={page} pages={list.pages} search={{ q: q || undefined, sort: sort === "relevance" ? undefined : sort }} to="/shop" />
      </div>
    </main>
  );
}
