import { Link } from "@tanstack/react-router";

/** Numbered pagination with real links, so every page is crawlable. */
export function Pager({ page, pages, to, params, search }: {
  page: number;
  pages: number;
  to: "/shop" | "/shop/$category";
  params?: { category: string };
  search: { q?: string; sort?: string };
}) {
  if (pages <= 1) return null;
  const nums = new Set([1, pages, page - 1, page, page + 1, page - 2, page + 2].filter((n) => n >= 1 && n <= pages));
  const list = [...nums].sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  list.forEach((n, i) => {
    if (i > 0 && n - list[i - 1] > 1) items.push("gap");
    items.push(n);
  });
  const linkProps = (n: number) => ({ to, params, search: { ...search, page: n > 1 ? n : undefined } }) as unknown as Parameters<typeof Link>[0];
  return (
    <nav aria-label="Pages" className="pc-pager">
      {page > 1 ? <Link {...linkProps(page - 1)} rel="prev">Prev</Link> : <span aria-disabled="true">Prev</span>}
      {items.map((n, i) =>
        n === "gap" ? (
          <span className="pc-pager__gap" key={`g${i}`}>…</span>
        ) : (
          <Link {...linkProps(n)} aria-current={n === page ? "page" : undefined} key={n}>{n}</Link>
        ),
      )}
      {page < pages ? <Link {...linkProps(page + 1)} rel="next">Next</Link> : <span aria-disabled="true">Next</span>}
    </nav>
  );
}
