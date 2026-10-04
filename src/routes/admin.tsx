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
  type AdminProduct,
} from "@/lib/api/admin.functions";
import { categories, categoryById, formatPrice } from "@/lib/categories";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/admin")({
  loader: () => adminSession(),
  head: () => pageHead({ title: "Admin", description: "Store admin", path: "/admin", noindex: true }),
  component: Admin,
});

type Tab = "products" | "prices" | "quotes" | "messages";

function Admin() {
  const session = Route.useLoaderData();
  const [signedIn, setSignedIn] = useState(session.signedIn);
  if (!signedIn) return <Login configured={session.configured} onDone={() => setSignedIn(true)} />;
  return <Dashboard onLogout={() => setSignedIn(false)} />;
}

function Login({ configured, onDone }: { configured: boolean; onDone: () => void }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminLogin({ data: { key } });
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
            <label htmlFor="admin-key">Admin key</label>
            <input autoComplete="current-password" autoFocus id="admin-key" onChange={(e) => setKey(e.target.value)} type="password" value={key} />
          </div>
          {error ? <p className="pc-error" role="alert">{error}</p> : null}
          <button className="pc-cta-lookup" disabled={busy || !key} type="submit">{busy ? "Signing in" : "Sign in"}</button>
        </form>
      </div>
    </main>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("products");
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
          <button className="pc-admin__logout" onClick={() => adminLogout().then(onLogout)} type="button">Sign out</button>
        </header>
        {stats ? (
          <ul className="pc-admin__stats">
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
              ["products", "Products"],
              ["prices", "Import prices"],
              ["quotes", "Quote requests"],
              ["messages", "Messages"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button aria-selected={tab === id} key={id} onClick={() => setTab(id)} role="tab" type="button">{label}</button>
          ))}
        </nav>
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
