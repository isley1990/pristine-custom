export type Category = {
  id: string;
  name: string;
  blurb: string;
  /** Longer copy for the category page: what's inside and how to choose. Used for SEO and AI answers. */
  intro: string;
  image: string;
};

const img = (n: string) => `/assets/catalog/${n}.webp`;

export const categories: Category[] = [
  { id: "tires-wheels", name: "Tires & Wheels", image: img("wheels"),
    blurb: "Trailer wheels, ST tires and mounted tire and wheel assemblies from 8 to 16 inches.",
    intro: "Aluminum, galvanized and painted steel trailer wheels in 4, 5, 6 and 8 lug patterns, plus ST radial and bias trailer tires and ready-to-bolt-on mounted assemblies. Match the bolt pattern and load range to your axle before you order." },
  { id: "axles-hubs", name: "Axles & Hubs", image: img("axles"),
    blurb: "Complete trailer axles, hubs, spindles, bearings, seals and dust caps.",
    intro: "Galvanized and painted leaf spring and torsion axles from Dexter and Autoflex-Knott, idler and brake hubs, spindles, bearing kits, seals and dust caps. Measure hub face and spring centers before replacing an axle." },
  { id: "brakes", name: "Brakes", image: img("hubs"),
    blurb: "Disc and drum brake kits, calipers, rotors, actuators and brake lines.",
    intro: "Electric and hydraulic surge brakes for utility and boat trailers: Kodiak and Dexter disc brake kits, calipers, pads, rotors, drums, electric brake assemblies, surge actuators, electric-over-hydraulic units and DOT brake lines." },
  { id: "boat-trailer-parts", name: "Boat Trailer Parts", image: img("boat"),
    blurb: "Bunk brackets, bunk carpet, keel and bunk rollers for boat trailers.",
    intro: "Everything that supports the hull: galvanized bunk brackets, marine bunk carpet, keel rollers, spool rollers, skid pads and pontoon brackets." },
  { id: "jacks", name: "Jacks", image: img("jacks"),
    blurb: "Swivel, A-frame and drop leg trailer tongue jacks.",
    intro: "Bolt-on swivel jacks, A-frame top wind jacks, drop leg jacks and replacement wheels and caps from Dutton-Lainson, Fulton, RAM and Knott, rated from 1,000 to 5,000 lb." },
  { id: "fenders", name: "Fenders", image: img("fenders"),
    blurb: "Single and tandem axle fenders in steel, aluminum, diamond plate and plastic.",
    intro: "Round, square and teardrop trailer fenders for single and tandem axles in galvanized steel, cold rolled steel, aluminum diamond plate and plastic. Check width, length and height against your tire size." },
  { id: "guide-poles", name: "Guide Poles", image: img("guidepoles"),
    blurb: "Guide-on poles, side bunk guides and replacement PVC for boat trailers.",
    intro: "Boat trailer guide-on poles, V-guides and side bunk guides with replacement PVC, caps and LED pipe lights that make loading easier at the ramp." },
  { id: "enclosed-trailer", name: "Enclosed Trailer", image: img("enclosed"),
    blurb: "Roof vents, door latches, hinges and E-track for cargo trailers.",
    intro: "Parts for enclosed cargo trailers: roof vents and replacement tops, door latches and holders, cam locks, hinges and E-track with rings and wood holders." },
  { id: "leaf-springs", name: "Leaf Springs", image: img("springs"),
    blurb: "Double eye and slipper springs, hangers, shackles and equalizers.",
    intro: "Double eye and slipper leaf springs from 1,000 lb up, plus hangers, shackles, equalizers, spring seats and U-bolt kits to rebuild a trailer suspension." },
  { id: "towing", name: "Towing Products", image: img("couplers"),
    blurb: "Couplers, ball mounts, hitch balls, pintle hooks and trailer tongues.",
    intro: "A-frame and straight tongue couplers, ball mounts, hitch balls, receiver adapters, pintle hooks and rings, coupler pins and galvanized trailer tongues." },
  { id: "lights-wiring", name: "Lights and Wiring", image: img("lights"),
    blurb: "Submersible LED lights, harnesses, connectors and breakaway kits.",
    intro: "Submersible LED and incandescent tail lights, side markers, ID bars, license lights, 4, 5 and 7 way connectors and adapters, wiring harnesses, junction boxes and breakaway kits." },
  { id: "mounting-hardware", name: "Mounting Hardware", image: img("hardware"),
    blurb: "U-bolts, carriage bolts, nuts, washers and brackets.",
    intro: "Galvanized, zinc plated and stainless steel trailer hardware: U-bolts, carriage and hex bolts, lock nuts, washers, brackets and clamps." },
  { id: "boat-marine", name: "Boat & Marine", image: img("marine"),
    blurb: "Winches, winch posts, bow rollers and bow stops.",
    intro: "Dutton-Lainson, RAM and Knott boat trailer winches and straps, winch posts, bow rollers, V stops and wobble roller parts." },
  { id: "trailer-maintenance", name: "Trailer Maintenance", image: img("maintenance"),
    blurb: "Bearing grease, lubricants, cold galvanizing paint and safety labels.",
    intro: "Marine wheel bearing grease, grease guns, corrosion protection sprays, cold galvanizing paint and trailer safety labels to keep your trailer road ready." },
  { id: "tie-downs", name: "Tie-Downs", image: img("accessories"),
    blurb: "Ratchet straps, safety cables, D-rings and anchors.",
    intro: "Ratchet straps, safety cables, weld-on and recessed D-rings, flush mount anchors and backing plates rated for real loads." },
];

export const categoryById = (id: string) => categories.find((c) => c.id === id);

/** Public base for product photos in Supabase Storage (public bucket). */
export const PRODUCT_IMG_BASE =
  "https://nhikynfosbyqlvixqizz.supabase.co/storage/v1/object/public/pristine-products/";

export function productImage(path: string | null | undefined, category: string): string {
  if (path) return path.startsWith("http") ? path : PRODUCT_IMG_BASE + path;
  return categoryById(category)?.image ?? "/assets/catalog/wheels.webp";
}

export function formatPrice(n: number): string {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}
