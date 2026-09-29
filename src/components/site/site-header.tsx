import { useEffect, useRef, useState, type FormEvent } from "react";

import { formatPrice, openCatalog, searchProducts } from "@/lib/catalog";

import { useCart } from "./cart-context";
import { AddToCart } from "./ctas";
import { CartIcon, Close, MenuIcon, SearchIcon, UserIcon } from "./icons";

const MENU = [
  { href: "/how-to", label: "How To's" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
  { href: "/shipping-returns", label: "Shipping and Return Policy" },
];

function SearchBox() {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const blurTimer = useRef<number | undefined>(undefined);
  const trimmed = q.trim();
  const results = trimmed.length >= 2 ? searchProducts(trimmed) : [];
  const showDrop = focus && trimmed.length >= 2;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    setFocus(false);
    openCatalog({ q: trimmed, category: "all" });
  };

  return (
    <form
      className="pc-search"
      onBlur={() => {
        blurTimer.current = window.setTimeout(() => setFocus(false), 150);
      }}
      onFocus={() => {
        window.clearTimeout(blurTimer.current);
        setFocus(true);
      }}
      onSubmit={submit}
      role="search"
    >
      <label className="pc-sr" htmlFor="part-lookup">Part number lookup</label>
      <input
        autoComplete="off"
        id="part-lookup"
        onChange={(e) => setQ(e.target.value)}
        placeholder="Part # lookup"
        type="search"
        value={q}
      />
      <button aria-label="Search parts" className="pc-search__go" type="submit">
        <SearchIcon />
      </button>
      {showDrop ? (
        <div className="pc-search__drop pc-glass">
          {results.length === 0 ? (
            <p className="pc-search__empty">No parts match "{trimmed}". Try a part number like PC-W1506.</p>
          ) : (
            <>
              <ul>
                {results.slice(0, 6).map((p) => (
                  <li key={p.sku}>
                    <img alt="" height={44} loading="lazy" src={p.image} width={44} />
                    <div className="pc-search__meta">
                      <p className="pc-search__name">{p.name}</p>
                      <p className="pc-search__sku">{p.sku} · {formatPrice(p.price)}</p>
                    </div>
                    <AddToCart compact product={p} />
                  </li>
                ))}
              </ul>
              <button className="pc-search__all" type="submit">
                See all {results.length} result{results.length === 1 ? "" : "s"}
              </button>
            </>
          )}
        </div>
      ) : null}
    </form>
  );
}

function CartButton() {
  const { count, subtotal, setOpen } = useCart();
  return (
    <button aria-label={`Open cart, ${count} items`} className="pc-cartbtn" onClick={() => setOpen(true)} type="button">
      <span className="pc-cartbtn__total">{formatPrice(subtotal)}</span>
      <CartIcon />
      <span className="pc-cartbtn__count">({count})</span>
    </button>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className="pc-header">
      <div className="pc-header__bar pc-glass">
        <a aria-label="Pristine Custom home" className="pc-header__logo" href="/">
          <img alt="Pristine Custom Wheels and Trailer Parts" height={88} src="/assets/brand/logo_main.webp" width={240} />
        </a>
        <div className="pc-header__main">
          <div className="pc-header__top">
            <SearchBox />
            <CartButton />
            <button
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="pc-header__burger"
              onClick={() => setMenuOpen((v) => !v)}
              type="button"
            >
              {menuOpen ? <Close /> : <MenuIcon />}
            </button>
          </div>
          <nav aria-label="Main" className="pc-menu" data-open={menuOpen ? "true" : undefined}>
            <ul>
              <li>
                <a className="pc-menu__shop" href="/#catalog" onClick={() => setMenuOpen(false)}>
                  Shop Parts
                </a>
              </li>
              {MENU.map((m) => (
                <li key={m.href}>
                  <a href={m.href} onClick={() => setMenuOpen(false)}>{m.label}</a>
                </li>
              ))}
              <li>
                <a className="pc-menu__account" href="/account" onClick={() => setMenuOpen(false)}>
                  <UserIcon />
                  My Account
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
