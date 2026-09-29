import { createFileRoute } from "@tanstack/react-router";

import { ScrollScrub, type ScrollScrubScene } from "@/components/scroll-scrub/scroll-scrub";
import { CatalogSection } from "@/components/site/catalog-section";
import { BrowseButton, ClosingQuoteButton, HeroQuoteButton } from "@/components/site/ctas";
import { FitmentGuide } from "@/components/site/fitment-guide";
import { QuoteSection } from "@/components/site/quote-section";
import { ValueRail } from "@/components/site/value-rail";
import { scrollScrubScenes, scrollScrubTheme } from "@/scroll-scrub-scenes";

export const Route = createFileRoute("/")({
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
  return (
    <main className="pc-page">
      <ScrollScrub scenes={scenes} theme={scrollScrubTheme} />
      <div className="pc-after">
        <CatalogSection />
        <ValueRail />
        <FitmentGuide />
        <QuoteSection />
      </div>
    </main>
  );
}
