# Pristine Custom: design brief

**Design read:** Trailer owners, haulers and wheel enthusiasts shopping for custom wheels, tires and trailer parts. Register: showroom-grade, confident, precise; a parts counter that feels like a car launch.

**Concept spine:** "The showroom turntable." The whole site is a polished dark showroom. The film walks the visitor around one pristine trailer, from a macro chrome spoke to the full hero beauty shot, and every section after it is a frosted-glass display case sitting in that same red-lit room.

**Reference:** sturdybuiltonline.com (catalog structure: axles galvanized/painted, tires and wheels, hubs and brakes, couplers, jacks, lights, fenders, guide-ons, accessories). Their site blocks automated access; structure was taken from their public listings.

**Delivery tier:** cinema (scroll-scrub film is the Tier-1 mechanic; light hover and transform micro-motion elsewhere).

**Locked palette (user brand override, taken from the supplied logo):**
- Background `#0B0C0F`, raised `#121419`
- Ink (chrome white) `#EEF0F3`, muted `#A0A7B2`
- Accent signal red `#D6232F` (hot `#EF3340`, deep `#8E0F19`)
- Glass: white at 5 to 10 percent with 14 percent hairline borders, 18 to 20px backdrop blur
Defense: black, polished chrome and signal red are the logo's own colors; near-black + red is the user's explicit brand, not a default reach.

**Locked type:** Saira (italic 800, uppercase) for display, echoing the logo's heavy italic racing letterforms; Barlow for body (automotive signage heritage, highly legible); JetBrains Mono for spec strips. No serif.

Animation mode: animated-website

**Journey shape:** single-shot (one 15s continuous film, split into 4 frame-contiguous segments so each chapter owns a stretch of the same take; seams are adjacent frames of one render).

**Journey:**
1. Macro chrome spoke emerging from darkness. "Built to roll pristine." Hero CTAs.
2. Wheel lip and tire tread. "Chrome that holds up." Tags: lug patterns, mounted and balanced.
3. Diamond-plate rail and reflective tape. "Every part under the frame." Tags: axles, hubs.
4. Wide hero beauty shot of the trailer. "Your trailer, done right." Closing quote CTA.
The journey enacts the spine: a slow walk-around of one pristine build, detail first, whole machine last.

**World grammar:** dark seamless charcoal studio, glossy black reflective floor, cool chrome key light, thin signal-red rim light, faint haze, gloss-black trailer with chrome wheels, diamond plate, red/white DOT tape. No text in frame.

**Mobile framing:** subject center-safe; 720p mobile encodes; chapter copy docks to the bottom as a glass card.

**Delivery budget:** desktop clips total <= 32 MiB, mobile <= 16 MiB.

**Section plan:**
1. Scroll-scrub journey (4 chapters, glass copy cards) - family: full-bleed film
2. Catalog - family: asymmetric bento + glass tab panel with add-to-quote rows
3. Why Pristine - family: horizontal icon rail (single glass strip, divided)
4. Fitment guide - family: split image + numbered steps
5. Quote request - family: form panel split (copy + quote list left, glass form right), persists to D1
6. Footer - family: 3-column link footer
Eyebrows: 0 (budget 2).

**Asset plan:** scroll film (Seedance 2.5, 1080p), 8 category product shots, 8-icon generated line set (chrome + red), logo cutouts (main + badge) from the supplied logo, showroom scene (fitment image + cover), pre-blurred backdrop, favicon/app icons from the badge, OG cover composed with the real logo.

**CTA inventory (each its own component):**
- NavQuoteChip "Get a quote": skewed red chip with live quote-list count.
- HeroQuoteButton "Get a quote": red parallelogram slab, chrome sheen sweep on hover.
- BrowseButton "Browse catalog": glass ghost, arrow slides on hover.
- AddToQuote toggle: square plus that flips to a red check.
- FitmentLink "Get a quote": text link led by red triple slash, underline grows.
- ClosingQuoteButton "Get a quote": chrome-edged dark slab, red chevrons run on hover.
- SubmitQuote "Send request": full-width red bar, diagonal stripes travel on hover.

**Backend:** D1 table `quote_requests`; `/admin` lists requests when the `ADMIN_KEY` secret is set.
