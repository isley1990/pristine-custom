import { SITE } from "./site";

/**
 * Alerts the shop when a quote request or contact message arrives: an email (Resend) and a WhatsApp message (CallMeBot).
 * Both are optional and best-effort: a failed alert is logged and never blocks saving the customer's request.
 *
 * Env vars (Vercel > Settings > Environment Variables):
 *   RESEND_API_KEY   Resend API key (sending access is enough).
 *   RESEND_FROM      Sender, e.g. "Pristine Custom <avisos@yourdomain.com>". Defaults to Resend's test sender,
 *                    which can only deliver to the Resend account owner's own address until a domain is verified.
 *   NOTIFY_EMAIL     Comma-separated recipients. Defaults to the business email.
 *   WHATSAPP_NOTIFY  Comma-separated "phone:apikey" pairs from CallMeBot, e.g. "+19547981123:1234567".
 */

export type Alert = {
  kind: "quote" | "message";
  id: number | null;
  name: string;
  phone: string;
  email: string;
  topic: string;
  lines: string[];
  details: string;
};

const TIMEOUT_MS = 6000;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function title(a: Alert) {
  return a.kind === "quote" ? `New quote request${a.id ? ` #${a.id}` : ""} from ${a.name}` : `New message from ${a.name} (${a.topic})`;
}

async function withTimeout(url: string, init: RequestInit) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function sendEmail(a: Alert) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const to = (process.env.NOTIFY_EMAIL || SITE.email).split(",").map((s) => s.trim()).filter(Boolean);
  const admin = `${SITE.url}/admin`;
  const row = (label: string, value: string) =>
    value ? `<tr><td style="padding:4px 12px 4px 0;color:#666">${label}</td><td style="padding:4px 0"><strong>${value}</strong></td></tr>` : "";
  const html = `
<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;max-width:560px">
  <h2 style="margin:0 0 12px">${esc(title(a))}</h2>
  <table style="border-collapse:collapse">
    ${row("Name", esc(a.name))}
    ${row("Phone", a.phone ? `<a href="tel:${esc(a.phone.replace(/[^\d+]/g, ""))}">${esc(a.phone)}</a>` : "")}
    ${row("Email", a.email ? `<a href="mailto:${esc(a.email)}">${esc(a.email)}</a>` : "")}
    ${row(a.kind === "quote" ? "Category" : "Topic", esc(a.topic))}
  </table>
  ${a.lines.length ? `<h3 style="margin:16px 0 6px">Parts</h3><ul style="margin:0;padding-left:18px">${a.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""}
  ${a.details ? `<h3 style="margin:16px 0 6px">${a.kind === "quote" ? "Details" : "Message"}</h3><p style="white-space:pre-wrap;margin:0">${esc(a.details)}</p>` : ""}
  <p style="margin-top:20px"><a href="${admin}">Open the store admin</a>${a.email ? " · Reply to this email to answer the customer directly." : ""}</p>
</div>`;
  const text = [
    title(a),
    `Name: ${a.name}`,
    a.phone && `Phone: ${a.phone}`,
    a.email && `Email: ${a.email}`,
    `${a.kind === "quote" ? "Category" : "Topic"}: ${a.topic}`,
    a.lines.length ? `\nParts:\n${a.lines.map((l) => `- ${l}`).join("\n")}` : "",
    a.details && `\n${a.details}`,
    `\nAdmin: ${admin}`,
  ]
    .filter(Boolean)
    .join("\n");
  const res = await withTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "Pristine Custom Website <onboarding@resend.dev>",
      to,
      subject: title(a),
      html,
      text,
      ...(a.email ? { reply_to: a.email } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function sendWhatsApp(a: Alert) {
  const targets = (process.env.WHATSAPP_NOTIFY || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const i = p.lastIndexOf(":");
      return { phone: p.slice(0, i).trim(), apikey: p.slice(i + 1).trim() };
    })
    .filter((t) => t.phone && t.apikey);
  if (!targets.length) return;
  const body = [
    `*${title(a)}*`,
    a.phone && `Tel: ${a.phone}`,
    a.email && `Email: ${a.email}`,
    `${a.kind === "quote" ? "Category" : "Topic"}: ${a.topic}`,
    ...a.lines.slice(0, 15).map((l) => `• ${l}`),
    a.lines.length > 15 ? `…and ${a.lines.length - 15} more` : "",
    a.details && a.details.slice(0, 500),
    `${SITE.url}/admin`,
  ]
    .filter(Boolean)
    .join("\n");
  await Promise.all(
    targets.map(async (t) => {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(t.phone)}&apikey=${encodeURIComponent(t.apikey)}&text=${encodeURIComponent(body)}`;
      const res = await withTimeout(url, { method: "GET" });
      const out = await res.text();
      if (!res.ok || /error|invalid|not\s+active/i.test(out)) throw new Error(`CallMeBot ${res.status}: ${out.replace(/<[^>]+>/g, " ").slice(0, 200)}`);
    }),
  );
}

/** Sends every configured alert. Never throws. */
export async function notifyShop(a: Alert) {
  const results = await Promise.allSettled([sendEmail(a), sendWhatsApp(a)]);
  for (const r of results) if (r.status === "rejected") console.error("[notify]", r.reason);
}
