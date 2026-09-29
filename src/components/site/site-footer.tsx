import { categories } from "@/lib/catalog";

export function SiteFooter() {
  return (
    <footer className="pc-footer">
      <div className="pc-wrap">
        <div className="pc-footer__grid">
          <div className="pc-footer__brand">
            <img alt="Pristine Custom Wheels and Trailer Parts" className="pc-footer__logo" src="/assets/brand/logo_main.webp" width={260} height={95} />
            <p className="pc-footer__tag">Wheels, tires, trailer parts and accessories. Matched to your trailer, quoted by real people.</p>
          </div>
          <nav aria-label="Footer">
            <h2>Menu</h2>
            <ul>
              <li><a href="/#catalog">Shop Parts</a></li>
              <li><a href="/how-to">How To's</a></li>
              <li><a href="/about">About Us</a></li>
              <li><a href="/contact">Contact Us</a></li>
              <li><a href="/shipping-returns">Shipping and Return Policy</a></li>
              <li><a href="/account">My Account</a></li>
            </ul>
          </nav>
          <div>
            <h2>Categories</h2>
            <ul>
              {categories.slice(0, 7).map((c) => (
                <li key={c.id}><a href={`/?cat=${c.id}#catalog`}>{c.name}</a></li>
              ))}
            </ul>
          </div>
        </div>
        <p className="pc-footer__base">© 2026 Pristine Custom Wheels & Trailer Parts</p>
      </div>
    </footer>
  );
}
