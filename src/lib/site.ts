/** Canonical site settings used for SEO tags, JSON-LD and sitemaps. */
export const SITE = {
  name: "Pristine Custom Wheels & Trailer Parts",
  shortName: "Pristine Custom",
  url: (typeof process !== "undefined" && process.env?.SITE_URL) || "https://pristine-custom.vercel.app",
  description:
    "Trailer parts, custom trailer wheels and tires, axles, brakes, lights and boat trailer parts. Search 2,300+ parts by part number and request a fitment-checked quote.",
  logo: "/assets/brand/logo_main.webp",
  phone: "+1-954-797-1123",
  phoneHref: "tel:+19547971123",
  phoneDisplay: "(954) 797-1123",
  email: "pristinecustomwheels@gmail.com",
  ogImage: "https://d2ol7oe51mr4n9.cloudfront.net/user_3Jqhc1Ufis49sz6GBGQdw7AizU2/1a61c9d8-8092-4cf3-8763-da4663af618e.jpg",
};

export const abs = (path: string) => (path.startsWith("http") ? path : `${SITE.url}${path}`);

/** Standard head tags for a page: title, description, canonical and social cards. */
export function pageHead(opts: { title: string; description: string; path: string; image?: string; noindex?: boolean; jsonLd?: unknown[] }) {
  const title = opts.title.includes("Pristine") ? opts.title : `${opts.title} | Pristine Custom`;
  const image = abs(opts.image ?? SITE.ogImage);
  const url = abs(opts.path);
  return {
    meta: [
      { title },
      { name: "description", content: opts.description },
      { property: "og:title", content: title },
      { property: "og:description", content: opts.description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE.name },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: opts.description },
      { name: "twitter:image", content: image },
      ...(opts.noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: (opts.jsonLd ?? []).map((data) => ({ type: "application/ld+json", children: JSON.stringify(data) })),
  };
}

export const orgJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "AutoPartsStore",
  "@id": `${SITE.url}/#store`,
  name: SITE.name,
  alternateName: SITE.shortName,
  url: SITE.url,
  logo: abs(SITE.logo),
  image: SITE.ogImage,
  description: SITE.description,
  priceRange: "$$",
  telephone: SITE.phone,
  email: SITE.email,
  contactPoint: [{ "@type": "ContactPoint", contactType: "sales", telephone: SITE.phone, email: SITE.email, areaServed: "US", availableLanguage: ["English", "Spanish"] }],
  knowsAbout: [
    "Trailer wheels", "Trailer tires", "Trailer axles", "Trailer brakes", "Boat trailer parts",
    "Trailer lights and wiring", "Leaf springs", "Trailer couplers", "Trailer jacks", "Trailer fenders",
  ],
});

export const websiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE.url}/#website`,
  name: SITE.name,
  url: SITE.url,
  publisher: { "@id": `${SITE.url}/#store` },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/shop?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
});

export const breadcrumbJsonLd = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.path) })),
});
