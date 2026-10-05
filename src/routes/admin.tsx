import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  adminBulkUpdate,
  adminDeleteProduct,
  adminImportPrices,
  adminListMessages,
  adminListProducts,
  adminListQuotes,
  adminLogin,
  adminLogout,
  adminSaveProduct,
  adminSession,
  adminStats,
  adminUploadImage,
  adminGetSettings,
  adminListOrders,
  adminSaveSettings,
  adminTestDelivery,
  adminUpdateOrder,
  type AdminOrder,
  type AdminProduct,
} from "@/lib/api/admin.functions";
import { deliveryFee, type StoreSettings } from "@/lib/store-config";
import { categories, categoryById, formatPrice } from "@/lib/categories";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/admin")({
  loader: () => adminSession(),
  head: () => pageHead({ title: "Admin", description: "Store admin", path: "/admin", noindex: true }),
  component: Admin,
});

type Tab = "orders" | "products" | "prices" | "quotes" | "messages" | "settings";

function Admin() {
  const session = Route.useLoaderData();
  const [signedIn, setSignedIn] = useState(session.signedIn);
  if (!signedIn) return <Login configured={session.configured} onDone={() => setSignedIn(true)} />;
  return <Dashboard onLogout={() => setSignedIn(false)} />;
}

function Login({ configured, onDone }: { configured: boolean; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminLogin({ data: { email: email.trim(), key } });
      if (res.ok) onDone();
      else setError(res.error);
    } catch {
      setError("Could not sign in. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="pc-admin">
      <div className="pc-wrap pc-admin__login">
        <form className="pc-form pc-glass" onSubmit={submit}>
          <h1 className="pc-account__h">Store admin</h1>
          {!configured ? <p className="pc-error">Set the ADMIN_KEY environment variable in Vercel, then redeploy.</p> : null}
          <div className="pc-field">
            <label htmlFor="admin-email">Email</label>
            <input autoComplete="username" autoFocus id="admin-email" onChange={(e) => setEmail(e.target.value)} type="email" value={email} />
          </div>
          <div className="pc-field">
            <label htmlFor="admin-key">Password</label>
            <input autoComplete="current-password" id="admin-key" onChange={(e) => setKey(e.target.value)} type="password" value={key} />
          </div>
          {error ? <p className="pc-error" role="alert">{error}</p> : null}
          <button className="pc-cta-lookup" disabled={busy || !key || !email.trim()} type="submit">{busy ? "Signing in" : "Sign in"}</button>
        </form>
      </div>
    </main>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("orders");
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminStats>> | null>(null);
  const loadStats = useCallback(() => {
    adminStats().then(setStats).catch(() => onLogout());
  }, [onLogout]);
  useEffect(loadStats, [loadStats]);
  return (
    <main className="pc-admin">
      <div className="pc-wrap">
        <header className="pc-admin__head">
          <h1 className="pc-display">Store <span className="pc-red-text">admin</span></h1>
          <button className="pc-admin__logout" onClick={() => adminLogout().then(() => { onLogout(); window.location.assign("/account"); })} type="button">Sign out</button>
        </header>
        {stats ? (
          <ul className="pc-admin__stats">
            <li><strong>{stats.openOrders}</strong> open orders</li>
            <li><strong>{stats.total.toLocaleString("en-US")}</strong> products</li>
            <li><strong>{stats.active.toLocaleString("en-US")}</strong> visible</li>
            <li><strong>{stats.noPrice.toLocaleString("en-US")}</strong> without price</li>
            <li><strong>{stats.outOfStock}</strong> special order</li>
            <li><strong>{stats.quotes}</strong> quote requests</li>
            <li><strong>{stats.messages}</strong> messages</li>
          </ul>
        ) : null}
        <nav aria-label="Admin sections" className="pc-admin__tabs" role="tablist">
          {(
            [
              ["orders", "Orders"],
              ["products", "Products"],
              ["prices", "Import prices"],
              ["quotes", "Quote requests"],
              ["messages", "Messages"],
              ["settings", "Checkout & delivery"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button aria-selected={tab === id} key={id} onClick={() => setTab(id)} role="tab" type="button">{label}</button>
          ))}
        </nav>
        {tab === "orders" ? <Orders onChange={loadStats} /> : null}
        {tab === "settings" ? <Settings /> : null}
        {tab === "products" ? <Products onChange={loadStats} /> : null}
        {tab === "prices" ? <Prices onChange={loadStats} /> : null}
        {tab === "quotes" ? <Quotes /> : null}
        {tab === "messages" ? <Messages /> : null}
      </div>
    </main>
  );
}

const EMPTY: Omit<AdminProduct, "id" | "slug" | "updated_at" | "image"> & { id?: number; image?: string } = {
  part_number: "",
  name: "",
  category: "tires-wheels",
  brand: null,
  price: null,
  description: null,
  image_path: null,
  active: true,
  in_stock: true,
  featured: false,
};

type Filters = { q: string; category: string; status: "all" | "active" | "hidden" | "no-price" | "out-of-stock" | "featured"; page: number };

function Products({ onChange }: { onChange: () => void }) {
  const [filters, setFilters] = useState<Filters>({ q: "", category: "all", status: "all", page: 1 });
  const [qInput, setQInput] = useState("");
  const [data, setData] = useState<{ items: AdminProduct[]; total: number; pages: number } | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [editing, setEditing] = useState<typeof EMPTY | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    adminListProducts({ data: { ...filters, q: filters.q || undefined } })
      .then((d) => {
        setData(d);
        setSelected([]);
      })
      .catch((e: Error) => setMsg(e.message));
  }, [filters]);
  useEffect(load, [load]);

  const bulk = async (patch: Parameters<typeof adminBulkUpdate>[0]["data"]["patch"]) => {
    const res = await adminBulkUpdate({ data: { ids: selected, patch } });
    setMsg(`${res.updated} product${res.updated === 1 ? "" : "s"} updated.`);
    load();
    onChange();
  };

  return (
    <section aria-label="Products">
      <div className="pc-toolbar pc-glass pc-admin__filters">
        <form
          className="pc-toolbar__search"
          onSubmit={(e) => {
            e.preventDefault();
            setFilters((f) => ({ ...f, q: qInput.trim(), page: 1 }));
          }}
          role="search"
        >
          <label className="pc-sr" htmlFor="admin-q">Search products</label>
          <input id="admin-q" onChange={(e) => setQInput(e.target.value)} placeholder="Part #, name or brand" type="search" value={qInput} />
          <button type="submit">Search</button>
        </form>
        <select aria-label="Category" onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))} value={filters.category}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select aria-label="Status" onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as Filters["status"], page: 1 }))} value={filters.status}>
          <option value="all">All</option>
          <option value="active">Visible</option>
          <option value="hidden">Hidden</option>
          <option value="no-price">No price</option>
          <option value="out-of-stock">Special order</option>
          <option value="featured">Featured</option>
        </select>
        <button className="pc-cta-checkout pc-admin__new" onClick={() => setEditing({ ...EMPTY })} type="button">New product</button>
      </div>

      {selected.length ? (
        <div className="pc-admin__bulk pc-glass" role="region" aria-label="Bulk actions">
          <span>{selected.length} selected</span>
          <button onClick={() => bulk({ active: true })} type="button">Show</button>
          <button onClick={() => bulk({ active: false })} type="button">Hide</button>
          <button onClick={() => bulk({ featured: true })} type="button">Feature</button>
          <button onClick={() => bulk({ featured: false })} type="button">Unfeature</button>
          <button onClick={() => bulk({ in_stock: true })} type="button">In stock</button>
          <button onClick={() => bulk({ in_stock: false })} type="button">Special order</button>
          <select aria-label="Move to category" defaultValue="" onChange={(e) => e.target.value && bulk({ category: e.target.value })}>
            <option value="">Move to category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      ) : null}
      {msg ? <p className="pc-admin__msg" role="status">{msg}</p> : null}

      {data ? (
        <>
          <p className="pc-admin__count">{data.total.toLocaleString("en-US")} products</p>
          <div className="pc-admin__tablewrap">
            <table className="pc-admin__table">
              <thead>
                <tr>
                  <th>
                    <input
                      aria-label="Select all on this page"
                      checked={data.items.length > 0 && selected.length === data.items.length}
                      onChange={(e) => setSelected(e.target.checked ? data.items.map((p) => p.id) : [])}
                      type="checkbox"
                    />
                  </th>
                  <th>Photo</th>
                  <th>Part #</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr className={p.active ? "" : "is-hidden"} key={p.id}>
                    <td>
                      <input
                        aria-label={`Select ${p.name}`}
                        checked={selected.includes(p.id)}
                        onChange={(e) => setSelected((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))}
                        type="checkbox"
                      />
                    </td>
                    <td><img alt="" height={44} loading="lazy" src={p.image} width={44} /></td>
                    <td className="pc-mono">{p.part_number}</td>
                    <td>{p.name}</td>
                    <td>{categoryById(p.category)?.name ?? p.category}</td>
                    <td>{p.price == null ? <span className="pc-muted">None</span> : formatPrice(p.price)}</td>
                    <td>
                      {p.active ? "Visible" : "Hidden"}
                      {p.featured ? " · Featured" : ""}
                      {!p.in_stock ? " · Special order" : ""}
                    </td>
                    <td><button className="pc-admin__edit" onClick={() => setEditing(p)} type="button">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pc-pager">
            <button disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))} type="button">Prev</button>
            <span>Page {filters.page} of {data.pages}</span>
            <button disabled={filters.page >= data.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))} type="button">Next</button>
          </div>
        </>
      ) : (
        <p className="pc-admin__msg">Loading products…</p>
      )}

      {editing ? (
        <Editor
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setMsg(text);
            load();
            onChange();
          }}
        />
      ) : null}
    </section>
  );
}

async function fileToWebp(file: File): Promise<{ base64: string; contentType: "image/webp" | "image/jpeg" }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  let type: "image/webp" | "image/jpeg" = "image/webp";
  let dataUrl = canvas.toDataURL(type, 0.82);
  if (!dataUrl.startsWith("data:image/webp")) {
    type = "image/jpeg";
    dataUrl = canvas.toDataURL(type, 0.85);
  }
  return { base64: dataUrl.split(",")[1] ?? "", contentType: type };
}

function Editor({ initial, onClose, onSaved }: { initial: typeof EMPTY; onClose: () => void; onSaved: (msg: string) => void }) {
  const [f, setF] = useState(initial);
  const [priceText, setPriceText] = useState(initial.price == null ? "" : String(initial.price));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(initial.image);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!f.part_number.trim()) return setError("Enter the part number before adding a photo.");
    setUploading(true);
    setError(null);
    try {
      const img = await fileToWebp(file);
      const res = await adminUploadImage({ data: { partNumber: f.part_number, contentType: img.contentType, base64: img.base64 } });
      set("image_path", res.path);
      setPreview(res.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload the photo.");
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const price = priceText.trim() === "" ? null : Number(priceText.replace(/[$,\s]/g, ""));
    if (price !== null && (!Number.isFinite(price) || price < 0)) return setError("Enter a valid price, or leave it empty for Call for price.");
    setBusy(true);
    try {
      await adminSaveProduct({ data: { ...f, price, brand: f.brand || null, description: f.description || null } });
      onSaved(f.id ? "Product saved." : "Product created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!f.id) return;
    if (!window.confirm(`Delete "${f.name}" permanently? Hide it instead if you might sell it again.`)) return;
    setBusy(true);
    try {
      await adminDeleteProduct({ data: { id: f.id } });
      onSaved("Product deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
      setBusy(false);
    }
  };

  return (
    <div className="pc-drawer" data-open="true">
      <button aria-label="Close editor" className="pc-drawer__scrim" onClick={onClose} tabIndex={-1} type="button" />
      <aside aria-label={f.id ? "Edit product" : "New product"} aria-modal="true" className="pc-drawer__panel pc-glass pc-editor" role="dialog">
        <div className="pc-drawer__head">
          <h2>{f.id ? "Edit product" : "New product"}</h2>
          <button aria-label="Close" className="pc-drawer__close" onClick={onClose} type="button">×</button>
        </div>
        <form className="pc-editor__form" onSubmit={save}>
          <div className="pc-editor__photo">
            {preview ? <img alt="" height={120} src={preview} width={120} /> : <div className="pc-editor__nophoto">No photo</div>}
            <label className="pc-admin__upload">
              {uploading ? "Uploading…" : "Upload photo"}
              <input accept="image/*" disabled={uploading} onChange={(e) => upload(e.target.files?.[0])} type="file" />
            </label>
          </div>
          <div className="pc-row">
            <div className="pc-field">
              <label htmlFor="e-pn">Part number</label>
              <input id="e-pn" onChange={(e) => set("part_number", e.target.value)} required value={f.part_number} />
            </div>
            <div className="pc-field">
              <label htmlFor="e-price">Price (USD)</label>
              <input id="e-price" inputMode="decimal" onChange={(e) => setPriceText(e.target.value)} placeholder="Empty = Call for price" value={priceText} />
            </div>
          </div>
          <div className="pc-field">
            <label htmlFor="e-name">Name</label>
            <input id="e-name" onChange={(e) => set("name", e.target.value)} required value={f.name} />
          </div>
          <div className="pc-row">
            <div className="pc-field">
              <label htmlFor="e-cat">Category</label>
              <select id="e-cat" onChange={(e) => set("category", e.target.value)} value={f.category}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="pc-field">
              <label htmlFor="e-brand">Brand</label>
              <input id="e-brand" onChange={(e) => set("brand", e.target.value)} value={f.brand ?? ""} />
            </div>
          </div>
          <div className="pc-field">
            <label htmlFor="e-desc">Description</label>
            <textarea id="e-desc" onChange={(e) => set("description", e.target.value)} placeholder="Specs, fitment notes, what's included" value={f.description ?? ""} />
          </div>
          <div className="pc-editor__checks">
            <label><input checked={f.active} onChange={(e) => set("active", e.target.checked)} type="checkbox" /> Visible on the site</label>
            <label><input checked={f.in_stock} onChange={(e) => set("in_stock", e.target.checked)} type="checkbox" /> In stock</label>
            <label><input checked={f.featured} onChange={(e) => set("featured", e.target.checked)} type="checkbox" /> Featured on home page</label>
          </div>
          {error ? <p className="pc-error" role="alert">{error}</p> : null}
          <div className="pc-editor__actions">
            <button className="pc-cta-submit" disabled={busy || uploading} type="submit"><span>{busy ? "Saving" : "Save product"}</span></button>
            {f.id ? <button className="pc-admin__delete" disabled={busy} onClick={remove} type="button">Delete</button> : null}
          </div>
        </form>
      </aside>
    </div>
  );
}

function Prices({ onChange }: { onChange: () => void }) {
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Awaited<ReturnType<typeof adminImportPrices>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setRes(await adminImportPrices({ data: { csv } }));
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-label="Import prices" className="pc-form pc-glass">
      <h2 className="pc-account__h">Import prices</h2>
      <p className="pc-lede">
        Paste one product per line as <code>part number, price</code>, for example <code>24476, 89.95</code>. You can paste two columns
        copied from Excel. Leave the price empty to set Call for price.
      </p>
      <form onSubmit={run}>
        <div className="pc-field">
          <label htmlFor="csv">Prices</label>
          <textarea id="csv" onChange={(e) => setCsv(e.target.value)} rows={10} value={csv} />
        </div>
        {error ? <p className="pc-error">{error}</p> : null}
        <button className="pc-cta-submit" disabled={busy || !csv.trim()} type="submit"><span>{busy ? "Importing" : "Import prices"}</span></button>
      </form>
      {res ? (
        <div className="pc-account__result" role="status">
          <h3>{res.updated} price{res.updated === 1 ? "" : "s"} updated</h3>
          {res.missingCount ? <p>{res.missingCount} part numbers not found: {res.missing.join(", ")}</p> : null}
          {res.bad.length ? <p>Lines with an invalid price: {res.bad.join(" | ")}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function Quotes() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof adminListQuotes>>["rows"] | null>(null);
  useEffect(() => {
    adminListQuotes().then((r) => setRows(r.rows)).catch(() => setRows([]));
  }, []);
  if (!rows) return <p className="pc-admin__msg">Loading…</p>;
  if (!rows.length) return <p className="pc-admin__msg">No quote requests yet.</p>;
  return (
    <div className="pc-admin__tablewrap">
      <table className="pc-admin__table">
        <thead><tr><th>#</th><th>Date (UTC)</th><th>Name</th><th>Contact</th><th>Category</th><th>Parts</th><th>Details</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="pc-mono">{r.id}</td>
              <td>{r.created_at}</td>
              <td>{r.name}</td>
              <td>{[r.phone, r.email].filter(Boolean).join(" / ")}</td>
              <td>{r.category}</td>
              <td>{r.items.length ? <ul>{r.items.map((i) => <li key={i}>{i}</li>)}</ul> : "None"}</td>
              <td>{r.details ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Messages() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof adminListMessages>>["rows"] | null>(null);
  useEffect(() => {
    adminListMessages().then((r) => setRows(r.rows)).catch(() => setRows([]));
  }, []);
  if (!rows) return <p className="pc-admin__msg">Loading…</p>;
  if (!rows.length) return <p className="pc-admin__msg">No messages yet.</p>;
  return (
    <div className="pc-admin__tablewrap">
      <table className="pc-admin__table">
        <thead><tr><th>Date (UTC)</th><th>Name</th><th>Contact</th><th>Topic</th><th>Message</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.created_at}</td>
              <td>{r.name}</td>
              <td>{[r.phone, r.email].filter(Boolean).join(" / ")}</td>
              <td>{r.topic}</td>
              <td>{r.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Orders ---------- */

const STATUS_OPTIONS: [string, string][] = [
  ["pending_payment", "Waiting for payment"],
  ["paid", "Paid"],
  ["pay_later", "Pay at pickup / phone"],
  ["processing", "Preparing"],
  ["ready", "Ready for pickup"],
  ["out_for_delivery", "Out for delivery"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["refunded", "Refunded"],
];
const statusLabel = (s: string) => STATUS_OPTIONS.find(([k]) => k === s)?.[1] ?? s;
const METHOD_LABEL: Record<string, string> = { paypal: "PayPal", venmo: "Venmo", card: "Card (PayPal)", pay_later: "Pay at pickup / phone" };

function Orders({ onChange }: { onChange: () => void }) {
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ orders: AdminOrder[]; total: number } | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => {
    setData(null);
    adminListOrders({ data: { status, page } }).then(setData).catch(() => setData({ orders: [], total: 0 }));
  }, [status, page]);
  useEffect(load, [load]);

  const save = async (o: AdminOrder, st: string, notes: string) => {
    setMsg(null);
    try {
      await adminUpdateOrder({ data: { id: o.id, status: st as never, admin_notes: notes.trim() || null } });
      setMsg(`${o.orderNo} updated.`);
      onChange();
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  return (
    <div>
      <div className="pc-toolbar pc-glass pc-admin__filters">
        <label className="pc-toolbar__sort">
          Show
          <select onChange={(e) => { setStatus(e.target.value); setPage(1); }} value={status}>
            <option value="open">Open orders</option>
            <option value="all">All orders</option>
            {STATUS_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <button className="pc-admin__edit" onClick={load} type="button">Refresh</button>
        {data ? <p className="pc-toolbar__count">{data.total} orders</p> : null}
      </div>
      {msg ? <p className="pc-admin__msg" role="status">{msg}</p> : null}
      {!data ? <p className="pc-admin__msg">Loading orders…</p> : !data.orders.length ? (
        <p className="pc-admin__msg">No orders here yet. Paid and pay-later orders show under Open orders.</p>
      ) : (
        <div className="pc-orders">
          {data.orders.map((o) => (
            <OrderCard key={o.id} o={o} onSave={save} open={open === o.id} onToggle={() => setOpen(open === o.id ? null : o.id)} />
          ))}
        </div>
      )}
      {data && data.total > 30 ? (
        <div className="pc-pager">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} type="button">Prev</button>
          <span>{page}</span>
          <button disabled={page * 30 >= data.total} onClick={() => setPage(page + 1)} type="button">Next</button>
        </div>
      ) : null}
    </div>
  );
}

function OrderCard({ o, open, onToggle, onSave }: { o: AdminOrder; open: boolean; onToggle: () => void; onSave: (o: AdminOrder, st: string, notes: string) => void }) {
  const [st, setSt] = useState(o.status);
  const [notes, setNotes] = useState(o.admin_notes ?? "");
  return (
    <article className={`pc-order pc-glass is-${o.status}`}>
      <button aria-expanded={open} className="pc-order__head" onClick={onToggle} type="button">
        <span className="pc-order__no">{o.orderNo}</span>
        <span>{o.created_at}</span>
        <span>{o.name}</span>
        <span>{o.fulfillment === "pickup" ? "Pickup" : `Delivery · ${o.miles ?? "?"} mi`}</span>
        <span className="pc-order__badge">{statusLabel(o.status)}</span>
        <strong>{formatPrice(o.total)}</strong>
      </button>
      {open ? (
        <div className="pc-order__body">
          <div className="pc-order__cols">
            <div>
              <h4>Customer</h4>
              <p>{o.name}<br /><a href={`tel:${o.phone}`}>{o.phone}</a><br /><a href={`mailto:${o.email}`}>{o.email}</a></p>
              <h4>{o.fulfillment === "pickup" ? "Store pickup" : "Deliver to"}</h4>
              <p>{o.fulfillment === "pickup" ? "Customer picks up at the shop." : <>{o.address}<br /><small>Matched: {o.matched_address} · {o.miles} mi</small></>}</p>
              {o.notes ? <><h4>Customer notes</h4><p>{o.notes}</p></> : null}
              <h4>Payment</h4>
              <p>{METHOD_LABEL[o.payment_method] ?? o.payment_method}{o.paypal_capture_id ? <><br /><small>Capture {o.paypal_capture_id}{o.payer_email ? ` · ${o.payer_email}` : ""}</small></> : null}</p>
            </div>
            <div>
              <h4>Items</h4>
              <ul className="pc-order__items">
                {o.items.map((i) => (
                  <li key={i.sku}><span>{i.qty} × {i.name} <small>#{i.sku}</small></span><span>{formatPrice(i.lineTotal)}</span></li>
                ))}
              </ul>
              <dl className="pc-order__totals">
                <div><dt>Subtotal</dt><dd>{formatPrice(o.subtotal)}</dd></div>
                <div><dt>Delivery</dt><dd>{formatPrice(o.delivery_fee)}</dd></div>
                <div><dt>Tax</dt><dd>{formatPrice(o.tax)}</dd></div>
                <div><dt>Total</dt><dd><strong>{formatPrice(o.total)}</strong></dd></div>
              </dl>
            </div>
          </div>
          <div className="pc-order__edit">
            <label>Status
              <select onChange={(e) => setSt(e.target.value)} value={st}>
                {STATUS_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label className="pc-order__notes">Internal notes
              <input onChange={(e) => setNotes(e.target.value)} placeholder="Only visible here" value={notes} />
            </label>
            <button className="pc-admin__new" onClick={() => onSave(o, st, notes)} type="button">Save</button>
          </div>
          {o.status === "refunded" || o.status === "cancelled" ? <p className="pc-admin__msg">Refunds are issued in your PayPal account; then mark the order Refunded here.</p> : null}
        </div>
      ) : null}
    </article>
  );
}

/* ---------- Checkout & delivery settings ---------- */

function NumField({ label, value, onChange, step = 0.01, suffix }: { label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string }) {
  return (
    <div className="pc-field">
      <label>{label}{suffix ? ` (${suffix})` : ""}</label>
      <input inputMode="decimal" onChange={(e) => onChange(Number(e.target.value))} step={step} type="number" value={Number.isFinite(value) ? value : 0} />
    </div>
  );
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (b: boolean) => void; hint?: string }) {
  return (
    <label className="pc-toggle">
      <input checked={checked} onChange={(e) => onChange(e.target.checked)} type="checkbox" />
      <span>{label}{hint ? <small>{hint}</small> : null}</span>
    </label>
  );
}

function Settings() {
  const [s, setS] = useState<StoreSettings | null>(null);
  const [meta, setMeta] = useState<{ secretSet: boolean; secretFromEnv: boolean; clientIdFromEnv: boolean } | null>(null);
  const [secret, setSecret] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState({ address: "", subtotal: 250 });
  const [testOut, setTestOut] = useState<string | null>(null);

  const load = () => adminGetSettings().then((r) => { setS(r.settings); setMeta(r); });
  useEffect(() => void load(), []);
  if (!s || !meta) return <p className="pc-admin__msg">Loading settings…</p>;

  const up = <K extends keyof StoreSettings>(k: K, patch: Partial<StoreSettings[K]>) => setS({ ...s, [k]: { ...s[k], ...patch } });
  const d = s.delivery;
  const examples = [5, 15, 30, 60, 100].map((mi) => ({ mi, q: deliveryFee(d, mi, test.subtotal) }));

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await adminSaveSettings({ data: { settings: s, newSecret: secret || undefined } });
      if (!r.ok) setMsg(r.error);
      else {
        setMsg("Settings saved. Checkout uses them right away.");
        setSecret("");
        await load();
      }
    } catch (e) {
      setMsg((e as Error).message || "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const runTest = async () => {
    setTestOut("Checking…");
    try {
      const r = await adminTestDelivery({ data: { address: test.address, subtotal: test.subtotal, delivery: d } });
      if (!r.ok) return setTestOut(r.error);
      const q = r.quote;
      setTestOut(q.available ? `${r.matched}: ${q.miles} mi → ${q.free ? "FREE" : formatPrice(q.fee)} (${q.breakdown})` : `${r.matched}: ${q.reason}`);
    } catch {
      setTestOut("Could not check that address.");
    }
  };

  return (
    <div className="pc-settings">
      <section className="pc-form pc-glass">
        <h2 className="pc-account__h">Store & pickup</h2>
        <div className="pc-field"><label>Store address (delivery distance is measured from here)</label><input onChange={(e) => up("store", { address: e.target.value })} value={s.store.address} /></div>
        <div className="pc-field"><label>Pickup hours</label><input onChange={(e) => up("store", { pickupHours: e.target.value })} value={s.store.pickupHours} /></div>
        <Toggle checked={d.pickupEnabled} label="Offer free store pickup" onChange={(b) => up("delivery", { pickupEnabled: b })} />
      </section>

      <section className="pc-form pc-glass">
        <h2 className="pc-account__h">Delivery by miles</h2>
        <Toggle checked={d.enabled} label="Offer delivery" onChange={(b) => up("delivery", { enabled: b })} />
        <div className="pc-settings__grid">
          <NumField label="Base fee" onChange={(n) => up("delivery", { baseFee: n })} suffix="$" value={d.baseFee} />
          <NumField label="Miles included in base" onChange={(n) => up("delivery", { includedMiles: n })} step={1} value={d.includedMiles} />
          <NumField label="Rate per mile" onChange={(n) => up("delivery", { ratePerMile: n })} suffix="$" value={d.ratePerMile} />
          <NumField label="Long-distance rate starts at" onChange={(n) => up("delivery", { tierBreakMiles: n })} step={1} suffix="mi" value={d.tierBreakMiles} />
          <NumField label="Long-distance rate per mile" onChange={(n) => up("delivery", { tierRatePerMile: n })} suffix="$" value={d.tierRatePerMile} />
          <NumField label="Minimum delivery fee" onChange={(n) => up("delivery", { minFee: n })} suffix="$" value={d.minFee} />
          <NumField label="Maximum delivery distance" onChange={(n) => up("delivery", { maxMiles: n })} step={1} suffix="mi" value={d.maxMiles} />
          <NumField label="Free delivery on orders over" onChange={(n) => up("delivery", { freeOver: n })} suffix="$, 0 = off" value={d.freeOver} />
          <NumField label="Free delivery only within" onChange={(n) => up("delivery", { freeWithinMiles: n })} step={1} suffix="mi" value={d.freeWithinMiles} />
          <NumField label="Road distance factor" onChange={(n) => up("delivery", { roadFactor: n })} step={0.05} suffix="straight line × factor" value={d.roadFactor} />
        </div>
        <p className="pc-admin__msg">Example fees for a {formatPrice(test.subtotal)} order:</p>
        <ul className="pc-settings__examples">
          {examples.map(({ mi, q }) => (
            <li key={mi}><strong>{mi} mi</strong> {q.available ? (q.free ? "Free" : formatPrice(q.fee)) : "Not offered"}</li>
          ))}
        </ul>
        <div className="pc-settings__test">
          <div className="pc-field"><label>Test an address</label><input onChange={(e) => setTest({ ...test, address: e.target.value })} placeholder="2000 US-1, Fort Pierce, FL 34950" value={test.address} /></div>
          <NumField label="Order subtotal" onChange={(n) => setTest({ ...test, subtotal: n })} suffix="$" value={test.subtotal} />
          <button className="pc-admin__edit" disabled={test.address.length < 5} onClick={runTest} type="button">Check</button>
        </div>
        {testOut ? <p className="pc-admin__msg">{testOut}</p> : null}
      </section>

      <section className="pc-form pc-glass">
        <h2 className="pc-account__h">Sales tax</h2>
        <div className="pc-settings__grid">
          <NumField label="Tax rate" onChange={(n) => up("tax", { rate: n })} step={0.01} suffix="%" value={s.tax.rate} />
        </div>
        <Toggle checked={s.tax.taxDelivery} hint="Leave off if delivery is billed separately and optional." label="Charge tax on delivery" onChange={(b) => up("tax", { taxDelivery: b })} />
      </section>

      <section className="pc-form pc-glass">
        <h2 className="pc-account__h">Payments</h2>
        <Toggle checked={s.payments.paypalEnabled} hint="Needs the PayPal Client ID and Secret below." label="Online payments with PayPal" onChange={(b) => up("payments", { paypalEnabled: b })} />
        <Toggle checked={s.payments.venmoEnabled} hint="US buyers; shows on supported devices." label="Venmo button" onChange={(b) => up("payments", { venmoEnabled: b })} />
        <Toggle checked={s.payments.cardEnabled} hint="Guest debit/credit card through PayPal." label="Debit or credit card button" onChange={(b) => up("payments", { cardEnabled: b })} />
        <Toggle checked={s.payments.payLaterEnabled} hint="Order is saved and you collect payment by phone or at pickup." label="Pay at pickup / by phone" onChange={(b) => up("payments", { payLaterEnabled: b })} />
        <div className="pc-field">
          <label>Mode</label>
          <select onChange={(e) => up("payments", { mode: e.target.value as "sandbox" | "live" })} value={s.payments.mode}>
            <option value="sandbox">Sandbox (test payments)</option>
            <option value="live">Live (real payments)</option>
          </select>
        </div>
        <div className="pc-field">
          <label>PayPal Client ID{meta.clientIdFromEnv ? " (set in Vercel)" : ""}</label>
          <input disabled={meta.clientIdFromEnv} onChange={(e) => up("payments", { clientId: e.target.value })} placeholder="From developer.paypal.com → Apps & Credentials" value={s.payments.clientId} />
        </div>
        <div className="pc-field">
          <label>PayPal Secret {meta.secretFromEnv ? "(set in Vercel)" : meta.secretSet ? "(saved, hidden)" : "(not set)"}</label>
          <input autoComplete="off" disabled={meta.secretFromEnv} onChange={(e) => setSecret(e.target.value)} placeholder={meta.secretSet ? "Leave empty to keep the saved secret" : "Paste the secret"} type="password" value={secret} />
        </div>
      </section>

      <div className="pc-settings__save">
        {msg ? <p className="pc-admin__msg" role="status">{msg}</p> : null}
        <button className="pc-admin__new" disabled={busy} onClick={save} type="button">{busy ? "Saving…" : "Save settings"}</button>
      </div>
    </div>
  );
}
