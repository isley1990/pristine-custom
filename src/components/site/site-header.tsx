import { useEffect, useRef, useState, type FormEvent } from "react";

import { useNavigate } from "@tanstack/react-router";

import { quickSearch, type ProductCard } from "@/lib/api/products.functions";
import { formatPrice } from "@/lib/categories";

import { adminLogout } from "@/lib/api/admin.functions";
import { SITE } from "@/lib/site";

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
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const [results, setResults] = useState<ProductCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const blurTimer = useRef<number | undefined>(undefined);
  const trimmed = q.trim();
  const showDrop = focus && trimmed.length >= 2;

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }
    let live = true;
    setLoading(true);
    const t = window.setTimeout(() => {
      quickSearch({ data: { q: trimmed } })
        .then((r) => {
          if (!live) return;
          setResults(r.items);
          setTotal(r.total);
        })
        .catch(() => live && setResults([]))
        .finally(() => live && setLoading(false));
    }, 220);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [trimmed]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    setFocus(false);
    void navigate({ to: "/shop", search: { q: trimmed } });
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
        enterKeyHint="search"
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
        <div className="pc-search__drop pc-glass" aria-live="polite">
          {loading && results.length === 0 ? (
            <p className="pc-search__empty">Searching…</p>
          ) : results.length === 0 ? (
            <p className="pc-search__empty">No parts match "{trimmed}". Try a part number like 24476 or a size like ST205/75R15.</p>
          ) : (
            <>
              <ul>
                {results.map((p) => (
                  <li key={p.partNumber}>
                    <img alt="" height={44} loading="lazy" src={p.thumb ?? p.image} width={44} />
                    <a className="pc-search__meta" href={`/product/${p.slug}`}>
                      <p className="pc-search__name">{p.name}</p>
                      <p className="pc-search__sku">
                        #{p.partNumber} · {p.price == null ? "Call for price" : formatPrice(p.price)}
                      </p>
                    </a>
                    <AddToCart compact product={p} />
                  </li>
                ))}
              </ul>
              <button className="pc-search__all" type="submit">
                See all {total} result{total === 1 ? "" : "s"}
              </button>
            </>
          )}
        </div>
      ) : null}
    </form>
  );
}

function PhoneIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
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

export function SiteHeader({ signedIn = false }: { signedIn?: boolean }) {
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
          <img alt="Pristine Custom Wheels and Trailer Parts" fetchPriority="high" height={88} src="/assets/brand/logo_main-480.webp" width={240} />
        </a>
        <div className="pc-header__main">
          <div className="pc-header__top">
            <SearchBox />
            <a aria-label={`Call ${SITE.phoneDisplay}`} className="pc-callbtn" href={SITE.phoneHref}>
              <PhoneIcon />
              <span>{SITE.phoneDisplay}</span>
            </a>
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
                <a className="pc-menu__shop" href="/shop" onClick={() => setMenuOpen(false)}>
                  Shop Parts
                </a>
              </li>
              {MENU.map((m) => (
                <li key={m.href}>
                  <a href={m.href} onClick={() => setMenuOpen(false)}>{m.label}</a>
                </li>
              ))}
              {signedIn ? (
                <>
                  <li>
                    <a className="pc-menu__account" href="/admin" onClick={() => setMenuOpen(false)}>
                      <UserIcon />
                      Admin
                    </a>
                  </li>
                  <li>
                    <button className="pc-menu__signout" onClick={() => adminLogout().then(() => window.location.assign("/account"))} type="button">
                      Sign out
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <a className="pc-menu__account" href="/account" onClick={() => setMenuOpen(false)}>
                    <UserIcon />
                    My Account
                  </a>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
