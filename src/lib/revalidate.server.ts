import { SITE } from "./site";

/**
 * Asks Vercel to rebuild cached (ISR) pages now, so admin edits show up right away instead of
 * waiting for the daily expiry. Needs ISR_BYPASS_TOKEN (same value used at build time).
 * Never throws: a failed refresh only means the page updates on its daily rebuild.
 */
export async function revalidatePages(paths: string[], max = 300) {
  const token = process.env.ISR_BYPASS_TOKEN;
  if (!token || !paths.length) return;
  const queue = [...new Set(paths)].slice(0, max);
  const worker = async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      try {
        await fetch(`${SITE.url}${p}`, { method: "HEAD", headers: { "x-prerender-revalidate": token } });
      } catch {
        /* daily rebuild covers it */
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
}

export const productPath = (slug: string) => `/product/${slug}`;
