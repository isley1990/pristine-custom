import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = process.env.SITE_URL || new URL(request.url).origin;
        const body = [
          "User-agent: *",
          "Allow: /",
          "Disallow: /admin",
          "Disallow: /account",
          "Disallow: /*?q=",
          "",
          "# AI assistants and answer engines are welcome to read and cite this site.",
          "User-agent: GPTBot",
          "Allow: /",
          "User-agent: OAI-SearchBot",
          "Allow: /",
          "User-agent: ClaudeBot",
          "Allow: /",
          "User-agent: PerplexityBot",
          "Allow: /",
          "User-agent: Google-Extended",
          "Allow: /",
          "",
          `Sitemap: ${origin}/sitemap.xml`,
        ].join("\n");
        return new Response(body, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
        });
      },
    },
  },
});
