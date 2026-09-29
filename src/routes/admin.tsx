import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { listMessages, listQuotes, type ContactRow, type QuoteRow } from "@/lib/api/quote.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Quote requests | Pristine Custom" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: Admin,
});

function parseItems(raw: string): string {
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) && arr.length ? arr.join(", ") : "None";
  } catch {
    return "None";
  }
}

function Admin() {
  const [key, setKey] = useState("");
  const [rows, setRows] = useState<QuoteRow[] | null>(null);
  const [messages, setMessages] = useState<ContactRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await listQuotes({ data: { key } });
      if (res.status === "unconfigured") setMsg("Set the ADMIN_KEY secret in the site settings to unlock this page.");
      else if (res.status === "denied") setMsg("That key is not correct.");
      else {
        setRows(res.rows);
        const m = await listMessages({ data: { key } });
        setMessages(m.rows);
        if (!res.rows.length) setMsg("No quote requests yet.");
      }
    } catch {
      setMsg("Could not load requests. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="pc-admin">
      <div className="pc-wrap">
        <h1 className="pc-display">Quote requests</h1>
        <form onSubmit={load}>
          <label className="pc-sr" htmlFor="admin-key">Admin key</label>
          <input id="admin-key" onChange={(e) => setKey(e.target.value)} placeholder="Admin key" type="password" value={key} />
          <button disabled={busy || !key} type="submit">{busy ? "Loading" : "Show requests"}</button>
        </form>
        {msg ? <p className="pc-admin__msg">{msg}</p> : null}
        {rows && rows.length ? (
          <table>
            <thead>
              <tr><th>Date</th><th>Name</th><th>Contact</th><th>Category</th><th>Parts</th><th>Details</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.created_at}</td>
                  <td>{r.name}</td>
                  <td>{[r.phone, r.email].filter(Boolean).join(" / ")}</td>
                  <td>{r.category}</td>
                  <td>{parseItems(r.items)}</td>
                  <td>{r.details ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {messages.length ? (
          <>
            <h2 className="pc-account__h" style={{ marginTop: "3rem" }}>Contact messages</h2>
            <table>
              <thead>
                <tr><th>Date</th><th>Name</th><th>Contact</th><th>Topic</th><th>Message</th></tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id}>
                    <td>{m.created_at}</td>
                    <td>{m.name}</td>
                    <td>{[m.phone, m.email].filter(Boolean).join(" / ")}</td>
                    <td>{m.topic}</td>
                    <td>{m.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
      </div>
    </main>
  );
}
