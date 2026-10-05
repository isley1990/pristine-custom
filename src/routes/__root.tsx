import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
// Page metadata (title, description, favicon, social image), read at build time.
import appMetaJson from "../app-meta.json";
import { scrollScrubTheme } from "../scroll-scrub-scenes";
import { CartDrawer } from "../components/site/cart-drawer";
import { CartProvider } from "../components/site/cart-context";
import { SiteFooter } from "../components/site/site-footer";
import { SiteHeader } from "../components/site/site-header";
import { adminSession } from "../lib/api/admin.functions";

// Built-in defaults for any field that isn't set in app-meta.json.
const DEFAULT_TITLE = "Pristine Custom";
const DEFAULT_DESCRIPTION = "Custom wheels, tires and trailer parts.";

type AppMeta = {
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  favicon_url?: string | null;
  og_video_url?: string | null;
};

const appMeta = appMetaJson as AppMeta;

// Builds the document head (title, description, social tags, favicon) from app-meta.json.
function toOwnAssetUrl(value: string | null | undefined): string | null {
  return value || null;
}

function buildHead(meta: AppMeta) {
  const title = meta.og_title ?? DEFAULT_TITLE;
  const description = meta.og_description ?? DEFAULT_DESCRIPTION;
  const ogImage = toOwnAssetUrl(meta.og_image_url);
  const favicon = toOwnAssetUrl(meta.favicon_url);
  const ogVideo = toOwnAssetUrl(meta.og_video_url);

  return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title },
      { name: "description", content: description },
      { name: "author", content: "Pristine Custom" },
      { name: "theme-color", content: scrollScrubTheme.background },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" },
      ...(ogImage
        ? [
            { property: "og:image", content: ogImage },
            { name: "twitter:image", content: ogImage },
          ]
        : []),
      ...(ogVideo ? [{ property: "og:video", content: ogVideo }] : []),
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Saira:ital,wght@1,700;1,800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/assets/brand/icon-32.png" },
      { rel: "apple-touch-icon", href: "/assets/brand/icon-180.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      ...(favicon ? [{ rel: "icon", href: favicon }] : []),
    ],
  };
}

function NotFoundComponent() {
  return (
    <main className="pc-admin">
      <div className="pc-wrap">
        <h1 className="pc-display">Page not found</h1>
        <p className="pc-lede">That page moved or never existed.</p>
        <p style={{ marginTop: "1.5rem" }}>
          <Link className="pc-cta-browse" to="/">Back to home</Link>
        </p>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <main className="pc-admin">
      <div className="pc-wrap">
        <h1 className="pc-display">This page did not load</h1>
        <p className="pc-lede">Something went wrong on our end. Try again or head back home.</p>
        <p style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            className="pc-cta-browse"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            type="button"
          >
            Try again
          </button>
          <a className="pc-cta-browse" href="/">Home</a>
        </p>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Read the committed page metadata at build time (no runtime fetch).
  head: () => buildHead(appMeta),
  // Admin sign-in state for the menu. Sign in/out does a full page load, so this never needs refetching.
  loader: () => adminSession(),
  staleTime: Infinity,
  shouldReload: false,
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <head>
        <HeadContent />
      </head>
      <body className="pc-body">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const session = Route.useLoaderData();

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <SiteHeader signedIn={!!session?.signedIn} />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <SiteFooter />
        <CartDrawer />
      </CartProvider>
    </QueryClientProvider>
  );
}
