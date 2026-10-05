import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { PageShell } from "@/components/site/page-shell";
import { breadcrumbJsonLd, orgJsonLd, pageHead, SITE } from "@/lib/site";
import { submitContact } from "@/lib/api/quote.functions";

export const Route = createFileRoute("/contact")({
  head: () =>
    pageHead({
      title: "Contact Us",
      description: "Call or text Pristine Custom at (954) 797-1123, email pristinecustomwheels@gmail.com, or send a message about a trailer part, fitment or a return.",
      path: "/contact",
      jsonLd: [orgJsonLd(), breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Contact Us", path: "/contact" }])],
    }),
  component: Contact,
});

const TOPICS = ["Order question", "Fitment help", "Returns", "Other"] as const;
type Topic = (typeof TOPICS)[number];

function SendMessage({ busy }: { busy: boolean }) {
  return (
    <button className="pc-cta-submit" disabled={busy} type="submit">
      <span>{busy ? "Sending" : "Send message"}</span>
    </button>
  );
}

function Contact() {
  const [topic, setTopic] = useState<Topic>("Order question");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Add your name so we know who to reply to.");
    if (!email.trim() && !phone.trim()) return setError("Add a phone number or an email so we can reply.");
    if (message.trim().length < 5) return setError("Tell us a little more in the message.");
    setBusy(true);
    try {
      await submitContact({ data: { name: name.trim(), email: email.trim(), phone: phone.trim(), topic, message: message.trim(), website } });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell accent="Us" lede="Questions about an order, fitment or a return. Send a message and we reply by phone or email." title="Contact">
      <div className="pc-contact">
        <aside className="pc-contact__side">
          <div className="pc-glass pc-contact__card pc-contact__direct">
            <img alt="" height={44} src="/assets/icons/quality.png" width={44} />
            <div>
              <h2>Talk to the parts desk</h2>
              <p><a className="pc-contact__big" href={SITE.phoneHref}>{SITE.phoneDisplay}</a></p>
              <p><a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
              <p>Call or text with a part number, your bolt pattern or a photo of the old part.</p>
            </div>
          </div>
          <div className="pc-glass pc-contact__card">
            <img alt="" height={44} src="/assets/icons/quality.png" width={44} />
            <div>
              <h2>Need parts priced?</h2>
              <p>Add parts to your cart and send a quote request. It goes straight to our parts desk.</p>
              <a className="pc-cta-fit" href="/#quote">
                <span className="pc-slash" aria-hidden="true" />
                <span className="pc-cta-fit__label">Get a quote</span>
              </a>
            </div>
          </div>
          <div className="pc-glass pc-contact__card">
            <img alt="" height={44} src="/assets/icons/shipping.png" width={44} />
            <div>
              <h2>Tracking an order?</h2>
              <p>Use your email and request number in My Account to see what you sent us.</p>
              <a className="pc-cta-fit" href="/account">
                <span className="pc-slash" aria-hidden="true" />
                <span className="pc-cta-fit__label">My Account</span>
              </a>
            </div>
          </div>
        </aside>
        {sent ? (
          <div className="pc-done pc-glass" role="status">
            <h3>Message sent.</h3>
            <p>Thanks, {name.trim().split(" ")[0]}. We will get back to you soon.</p>
          </div>
        ) : (
          <form className="pc-form pc-glass" noValidate onSubmit={onSubmit}>
            <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="pc-field__legend">Topic</legend>
              <div className="pc-seg pc-seg--text" style={{ marginTop: "0.6rem" }}>
                {TOPICS.map((t) => (
                  <button aria-pressed={topic === t} key={t} onClick={() => setTopic(t)} type="button">{t}</button>
                ))}
              </div>
            </fieldset>
            <div className="pc-field">
              <label htmlFor="c-name">Name</label>
              <input autoComplete="name" id="c-name" onChange={(e) => setName(e.target.value)} placeholder="Full name" value={name} />
            </div>
            <div className="pc-row">
              <div className="pc-field">
                <label htmlFor="c-email">Email</label>
                <input autoComplete="email" id="c-email" onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" type="email" value={email} />
              </div>
              <div className="pc-field">
                <label htmlFor="c-phone">Phone</label>
                <input autoComplete="tel" id="c-phone" onChange={(e) => setPhone(e.target.value)} placeholder="Best number to reach you" type="tel" value={phone} />
              </div>
            </div>
            <div className="pc-field">
              <label htmlFor="c-msg">Message</label>
              <textarea id="c-msg" onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" value={message} />
            </div>
            <div className="pc-hp" aria-hidden="true">
              <label htmlFor="c-website">Website</label>
              <input autoComplete="off" id="c-website" onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} value={website} />
            </div>
            {error ? <p className="pc-error" role="alert">{error}</p> : null}
            <SendMessage busy={busy} />
          </form>
        )}
      </div>
    </PageShell>
  );
}
