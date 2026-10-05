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
  address: { street: "1621 91st Ct", city: "Vero Beach", region: "FL", postalCode: "32966", country: "US" },
  addressLine: "1621 91st Ct, Vero Beach, FL 32966",
  geo: { lat: 27.632454, lng: -80.514558 },
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=1621+91st+Ct%2C+Vero+Beach%2C+FL+32966",
  ogImage: "https://d2ol7oe51mr4n9.cloudfront.net/user_3Jqhc1Ufis49sz6GBGQdw7AizU2/1a61c9d8-8092-4cf3-8763-da4663af618e.jpg",
};

export const abs = (path: string) => (path.startsWith("http") ? path : `${SITE.url}${path}`);

/** Cut text at a word boundary so search snippets end cleanly. */
export function clampText(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[,;:.\s]+$/, "")}…`;
}

/** Brand suffix only when it fits (~60 chars); long product names keep their words instead. */
export function seoTitle(raw: string) {
  if (raw.includes("Pristine")) return clampText(raw, 65);
  const withBrand = `${raw} | Pristine Custom`;
  return withBrand.length <= 62 ? withBrand : clampText(raw, 65);
}

/** Standard head tags for a page: title, description, canonical and social cards. */
export function pageHead(opts: { title: string; description: string; path: string; image?: string; noindex?: boolean; jsonLd?: unknown[] }) {
  const title = seoTitle(opts.title);
  const description = clampText(opts.description, 158);
  const image = abs(opts.image ?? SITE.ogImage);
  const url = abs(opts.path);
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE.name },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
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
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE.address.street,
    addressLocality: SITE.address.city,
    addressRegion: SITE.address.region,
    postalCode: SITE.address.postalCode,
    addressCountry: SITE.address.country,
  },
  geo: { "@type": "GeoCoordinates", latitude: SITE.geo.lat, longitude: SITE.geo.lng },
  hasMap: SITE.mapsUrl,
  areaServed: [{ "@type": "State", name: "Florida" }, { "@type": "Country", name: "United States" }],
  currenciesAccepted: "USD",
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
