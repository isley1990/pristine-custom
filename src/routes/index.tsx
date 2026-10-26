import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { ScrollScrub } from "@/components/scroll-scrub/scroll-scrub";
import type { ProductCard } from "@/lib/api/products.functions";
import { CatalogSection } from "@/components/site/catalog-section";
import { BrowseButton, ClosingQuoteButton, HeroQuoteButton } from "@/components/site/ctas";
import { FaqSection, faqJsonLd } from "@/components/site/faq-section";
import { FitmentGuide } from "@/components/site/fitment-guide";
import { BoltPatternPanel, CategoryPanel, FeaturedPanel, QuoteStepsPanel } from "@/components/site/hero-panels";
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

// Chapter CTAs and companion panels. Built once from loader data (stable), so the scrub controller never rebuilds.
function buildScenes(counts: Record<string, number>, featured: ProductCard[]) {
  const asides = [<CategoryPanel counts={counts} />, <BoltPatternPanel />, <FeaturedPanel items={featured} />, <QuoteStepsPanel />];
  return scrollScrubScenes.map((scene, index) => ({
    ...scene,
    aside: asides[index],
    actions:
      index === 0 ? (
        <>
          <HeroQuoteButton />
          <BrowseButton />
        </>
      ) : index === scrollScrubScenes.length - 1 ? (
        <ClosingQuoteButton />
      ) : undefined,
  }));
}

function Index() {
  const { counts, featured } = Route.useLoaderData();
  const scenes = useMemo(() => buildScenes(counts, featured), [counts, featured]);
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
