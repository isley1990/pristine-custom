import { createFileRoute } from "@tanstack/react-router";

import { ScrollScrub, type ScrollScrubScene } from "@/components/scroll-scrub/scroll-scrub";
import { CatalogSection } from "@/components/site/catalog-section";
import { BrowseButton, ClosingQuoteButton, HeroQuoteButton } from "@/components/site/ctas";
import { FaqSection, faqJsonLd } from "@/components/site/faq-section";
import { FitmentGuide } from "@/components/site/fitment-guide";
import { QuoteSection } from "@/components/site/quote-section";
import { ValueRail } from "@/components/site/value-rail";
import { getCategoryCounts, getFeatured } from "@/lib/api/products.functions";
import { orgJsonLd, pageHead, SITE, websiteJsonLd } from "@/lib/site";
import { scrollScrubScenes, scrollScrubTheme } from "@/scroll-scrub-scenes";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [counts, featured] = await Promise.all([getCategoryCounts(), getFeatured()]);
    return { counts: counts.counts, featured: featured.items };
  },
  head: () =>
    pageHead({
      title: "Trailer Parts, Wheels & Tires in Vero Beach, FL | Pristine Custom",
      description: SITE.description,
      path: "/",
      jsonLd: [orgJsonLd(), websiteJsonLd(), faqJsonLd()],
    }),
  component: Index,
});

// Module constant: chapter CTAs attached once, so the scrub controller never rebuilds.
const scenes: ScrollScrubScene[] = scrollScrubScenes.map((scene, index) => {
  if (index === 0) {
    return {
      ...scene,
      actions: (
        <>
          <HeroQuoteButton />
          <BrowseButton />
        </>
      ),
    };
  }
  if (index === scrollScrubScenes.length - 1) {
    return { ...scene, actions: <ClosingQuoteButton /> };
  }
  return scene;
});

function Index() {
  const { counts, featured } = Route.useLoaderData();
  return (
    <main className="pc-page">
      <ScrollScrub scenes={scenes} theme={scrollScrubTheme} />
      <div className="pc-after">
        <CatalogSection counts={counts} featured={featured} />
        <ValueRail />
        <FitmentGuide />
        <QuoteSection />
        <FaqSection />
      </div>
    </main>
  );
}
