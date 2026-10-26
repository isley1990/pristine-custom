import { Link } from "@tanstack/react-router";

import type { ProductCard } from "@/lib/api/products.functions";
import { categories, catThumb, formatPrice } from "@/lib/categories";
import { SITE } from "@/lib/site";

import { Chevron } from "./icons";

/*
 * Companion panels for the home film. Each sits opposite its chapter's copy on
 * wide screens, so the empty half of the frame carries something useful.
 */

/** Start: the most-stocked categories, straight into the catalog. */
export function CategoryPanel({ counts }: { counts: Record<string, number> }) {
  const top = [...categories].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0)).slice(0, 6);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <nav aria-label="Popular categories" className="pc-fp pc-fp--cats">
      <h2 className="pc-fp__title">Shop by category</h2>
      <ul className="pc-fp__cats">
        {top.map((c) => (
          <li key={c.id}>
            <Link params={{ category: c.id }} to="/shop/$category">
              <img alt="" decoding="async" height={48} loading="lazy" src={catThumb(c.image)} width={48} />
              <span>
                <b>{c.name}</b>
                <small>{(counts[c.id] ?? 0).toLocaleString("en-US")} parts</small>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link className="pc-fp__more" to="/shop">
        All {categories.length} categories · {total.toLocaleString("en-US")} parts <Chevron />
      </Link>
    </nav>
  );
}

/** Lug circle drawn to scale-ish: one dot per stud on the bolt circle. */
function LugDiagram({ lugs }: { lugs: number }) {
  const dots = Array.from({ length: lugs }, (_, i) => {
    const a = (i / lugs) * Math.PI * 2 - Math.PI / 2;
    return { x: 24 + Math.cos(a) * 14, y: 24 + Math.sin(a) * 14 };
  });
  return (
    <svg aria-hidden="true" className="pc-fp__lug" height="48" viewBox="0 0 48 48" width="48">
      <circle cx="24" cy="24" fill="none" r="21" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="24" cy="24" fill="none" r="14" stroke="currentColor" strokeDasharray="2 3" strokeOpacity="0.45" />
      <circle cx="24" cy="24" fill="currentColor" fillOpacity="0.18" r="6.5" />
      {dots.map((d, i) => <circle cx={d.x} cy={d.y} fill="var(--pc-red-hot)" key={i} r="3" />)}
    </svg>
  );
}

const PATTERNS = [
  { lugs: 4, circle: '4 on 4"', fits: "8–12 in. wheels, light utility and jet ski trailers", q: "4 Lug" },
  { lugs: 5, circle: '5 on 4.5" · 5 on 4.75"', fits: "13–15 in. wheels, 2,000–3,500 lb axles, most boat trailers", q: "5 Lug" },
  { lugs: 6, circle: '6 on 5.5"', fits: "15–16 in. wheels, 5,200–6,000 lb axles, car haulers", q: "6 Lug" },
  { lugs: 8, circle: '8 on 6.5"', fits: "16 in. wheels, 7,000 lb and heavier axles", q: "8 Lug" },
];

/** Wheels: bolt pattern quick reference, each row opens the matching wheels. */
export function BoltPatternPanel() {
  return (
    <section aria-label="Bolt pattern reference" className="pc-fp pc-fp--lugs">
      <h2 className="pc-fp__title">Which bolt pattern is yours?</h2>
      <ul className="pc-fp__lugs">
        {PATTERNS.map((p) => (
          <li key={p.lugs}>
            <Link search={{ q: p.q }} to="/shop">
              <LugDiagram lugs={p.lugs} />
              <span>
                <b>{p.circle}</b>
                <small>{p.fits}</small>
              </span>
              <Chevron />
            </Link>
          </li>
        ))}
      </ul>
      <a className="pc-fp__more" href="/how-to#bolt-pattern">How to measure yours <Chevron /></a>
    </section>
  );
}

/** Parts: a few real catalog parts with list prices. */
export function FeaturedPanel({ items }: { items: ProductCard[] }) {
  const list = items.filter((p) => p.price != null).slice(0, 4);
  if (!list.length) return null;
  return (
    <section aria-label="Popular parts" className="pc-fp pc-fp--parts">
      <h2 className="pc-fp__title">Ready to bolt on</h2>
      <ul className="pc-fp__parts">
        {list.map((p) => (
          <li key={p.partNumber}>
            <Link params={{ slug: p.slug }} to="/product/$slug">
              <img alt="" decoding="async" height={64} loading="lazy" src={p.thumb ?? p.image} width={64} />
              <span>
                <b>{p.name}</b>
                <small>#{p.partNumber}</small>
              </span>
              <em>{formatPrice(p.price as number)}</em>
            </Link>
          </li>
        ))}
      </ul>
      <Link className="pc-fp__more" to="/shop">Browse all parts <Chevron /></Link>
    </section>
  );
}

/** Your build: how a quote request turns into parts on the trailer. */
export function QuoteStepsPanel() {
  return (
    <section aria-label="How a quote works" className="pc-fp pc-fp--steps">
      <h2 className="pc-fp__title">How your quote works</h2>
      <ol className="pc-fp__steps">
        <li><b>Send your list</b><small>Add parts to your quote list, or just describe your trailer.</small></li>
        <li><b>We check the fit</b><small>Bolt pattern, axle rating and tire size, against what you tow.</small></li>
        <li><b>Get your price</b><small>By phone or email. Pick up free in Vero Beach or get it delivered.</small></li>
      </ol>
      <div className="pc-fp__phones">
        <a href={SITE.phoneHref}>{SITE.phoneDisplay}</a>
        <a href={SITE.phoneEsHref} lang="es">Español {SITE.phoneEsDisplay}</a>
      </div>
    </section>
  );
}
