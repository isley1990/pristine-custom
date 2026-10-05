import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { useCart } from "@/components/site/cart-context";
import { PageShell } from "@/components/site/page-shell";
import { adminLogin, adminSession } from "@/lib/api/admin.functions";
import { trackRequest } from "@/lib/api/quote.functions";
import { formatPrice } from "@/lib/categories";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/account")({
  loader: () => adminSession(),
  head: () => pageHead({ title: "My Account", description: "Sign in, track a quote request and review your cart.", path: "/account", noindex: true }),
  component: Account,
});

type Found = { id: number; created_at: string; name: string; category: string; items: string; details: string | null };

function parseItems(raw: string): string[] {
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

function LookupButton({ busy }: { busy: boolean }) {
  return (
    <button className="pc-cta-lookup" disabled={busy} type="submit">
      {busy ? "Checking" : "Find my request"}
    </button>
  );
}

function SignIn() {
  const session = Route.useLoaderData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    try {
      const res = await adminLogin({ data: { email: email.trim(), key: password } });
      if (res.ok) window.location.assign("/admin");
      else setError(res.error);
    } catch {
      setError("Could not sign in. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (session.signedIn) {
    return (
      <div className="pc-form pc-glass pc-account__signin">
        <h2 className="pc-account__h">Signed in</h2>
        <p className="pc-list__empty">You are signed in to the store admin.</p>
        <a className="pc-cta-buy pc-account__go" href="/admin">Open admin panel</a>
      </div>
    );
  }
  return (
    <form className="pc-form pc-glass pc-account__signin" noValidate onSubmit={onSubmit}>
      <h2 className="pc-account__h">Sign in</h2>
      <div className="pc-field">
        <label htmlFor="s-email">Email</label>
        <input autoComplete="username" id="s-email" onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email" value={email} />
      </div>
      <div className="pc-field">
        <label htmlFor="s-pass">Password</label>
        <input autoComplete="current-password" id="s-pass" onChange={(e) => setPassword(e.target.value)} type="password" value={password} />
      </div>
      {error ? <p className="pc-error" role="alert">{error}</p> : null}
      <button className="pc-cta-buy pc-account__go" disabled={busy} type="submit">{busy ? "Signing in" : "Sign in"}</button>
    </form>
  );
}

function Account() {
  const { items, subtotal, count, setOpen } = useCart();
  const [email, setEmail] = useState("");
  const [num, setNum] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Found | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setFound(null);
    const id = Number.parseInt(num.replace(/[^0-9]/g, ""), 10);
    if (!email.trim() || !Number.isFinite(id) || id <= 0) return setMsg("Enter the email you used and your request number.");
    setBusy(true);
    try {
      const res = await trackRequest({ data: { email: email.trim(), id } });
      if (res.found) setFound(res.request);
      else setMsg("We could not find a request with that email and number.");
    } catch {
      setMsg("Check the email format and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell accent="Account" lede="Sign in, check a quote request you sent us, or pick up where you left off with your cart." title="My">
      <div className="pc-account">
        <SignIn />
        <form className="pc-form pc-glass" noValidate onSubmit={onSubmit}>
          <h2 className="pc-account__h">Track a request</h2>
          <div className="pc-field">
            <label htmlFor="a-email">Email</label>
            <input autoComplete="email" id="a-email" onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email" value={email} />
          </div>
          <div className="pc-field">
            <label htmlFor="a-num">Request number</label>
            <input id="a-num" inputMode="numeric" onChange={(e) => setNum(e.target.value)} placeholder="From your confirmation, like 12" value={num} />
          </div>
          {msg ? <p className="pc-error" role="alert">{msg}</p> : null}
          <LookupButton busy={busy} />
          {found ? (
            <div className="pc-account__result">
              <h3>Request #{found.id}</h3>
              <p className="pc-account__meta">Sent {found.created_at} UTC · {found.category} · Status: received</p>
              {parseItems(found.items).length ? (
                <ul>
                  {parseItems(found.items).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {found.details ? <p>{found.details}</p> : null}
            </div>
          ) : null}
        </form>
        <div className="pc-glass pc-account__cart">
          <h2 className="pc-account__h">Your cart</h2>
          {count === 0 ? (
            <p className="pc-list__empty">Your cart is empty.</p>
          ) : (
            <>
              <ul>
                {items.map((i) => (
                  <li key={i.sku}>
                    <span>{i.qty} x {i.name}</span>
                    <span>{i.price == null ? "Call for price" : formatPrice(i.qty * i.price)}</span>
                  </li>
                ))}
              </ul>
              <p className="pc-list__sub">Subtotal <strong>{formatPrice(subtotal)}</strong></p>
              <button className="pc-cta-browse" onClick={() => setOpen(true)} type="button">Open cart</button>
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}
