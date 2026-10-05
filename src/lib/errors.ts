/** Turn a thrown server error into a sentence a customer can act on (never raw validation JSON). */
export function friendlyError(e: unknown, fallback = "Something went wrong. Please check your details and try again."): string {
  const msg = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  if (!msg) return fallback;
  const t = msg.trim();
  if (t.startsWith("[") || t.startsWith("{")) {
    try {
      const issues = JSON.parse(t) as { path?: (string | number)[] }[];
      const field = Array.isArray(issues) ? String(issues[0]?.path?.slice(-1)[0] ?? "") : "";
      const names: Record<string, string> = { name: "your name", email: "your email", phone: "your phone number", street: "the street address", zip: "the ZIP code", city: "the city", notes: "the notes", message: "the message" };
      if (names[field]) return `Please check ${names[field]} and try again.`;
    } catch {
      // not JSON
    }
    return fallback;
  }
  if (/fetch|network|Failed to/i.test(t)) return "Connection problem. Check your internet and try again.";
  return t.length > 220 ? fallback : t;
}
