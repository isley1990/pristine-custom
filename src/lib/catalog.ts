export type Product = { sku: string; name: string; spec: string; price: number };

export type Category = {
  id: string;
  name: string;
  blurb: string;
  image: string;
  products: Product[];
};

const c = (id: string, name: string, blurb: string, image: string, products: Product[]): Category => ({
  id,
  name,
  blurb,
  image: `/assets/catalog/${image}.webp`,
  products,
});

export const categories: Category[] = [
  c("tires-wheels", "Tires & Wheels", "Custom chrome and machined wheels, ST radial tires and mounted packages.", "wheels", [
    { sku: "PC-W1506", name: "Chrome Modular Wheel 15x6", spec: "5 on 4.5 · 2,150 lb", price: 129 },
    { sku: "PC-W1665", name: "Black Machined Wheel 16x6.5", spec: "6 on 5.5 · 3,000 lb", price: 169 },
    { sku: "PC-T2057", name: "ST205/75R15 Radial Tire", spec: "Load range D · 8 ply", price: 104 },
    { sku: "PC-TW225", name: "Mounted ST225/75R15 on Chrome 15x6", spec: "Balanced, ready to bolt on", price: 259 },
  ]),
  c("axles-hubs", "Axles & Hubs", "Complete idler and brake axles plus hub kits built to your hub face.", "axles", [
    { sku: "PC-A3500G", name: "3,500 lb Galvanized Idler Axle", spec: "Leaf spring · 5 on 4.5", price: 289 },
    { sku: "PC-A5200E", name: "5,200 lb Electric Brake Axle", spec: "6 on 5.5 · 12 in brakes", price: 469 },
    { sku: "PC-H545K", name: "Idler Hub Kit 5 on 4.5", spec: "Bearings, seal, dust cap", price: 39.95 },
  ]),
  c("brakes", "Brakes", "Electric and disc brake assemblies, rotors and controller harnesses.", "hubs", [
    { sku: "PC-B12E", name: "12 in Electric Brake Assembly", spec: "Left and right pair", price: 119 },
    { sku: "PC-B10D", name: "10 in Disc Brake Kit", spec: "Stainless rotor, zinc caliper", price: 219 },
    { sku: "PC-B7K", name: "Brake Controller Harness", spec: "7-way plug-in", price: 34.95 },
  ]),
  c("boat-trailer-parts", "Boat Trailer Parts", "Bunk brackets, keel rollers and marine bunk carpet.", "boat", [
    { sku: "PC-BB8", name: "Swivel Bunk Bracket 8 in", spec: "Galvanized · pair", price: 42 },
    { sku: "PC-KR5", name: "Keel Roller 5 in", spec: "Black rubber · 5/8 in shaft", price: 18.5 },
    { sku: "PC-BC12", name: "Bunk Carpet 12 ft", spec: "Marine grade · charcoal", price: 29.95 },
  ]),
  c("jacks", "Jacks", "Swivel tongue jacks, drop leg jacks and caster wheels.", "jacks", [
    { sku: "PC-J2000", name: "Swivel Tongue Jack 2,000 lb", spec: "Side wind · 15 in lift", price: 54.95 },
    { sku: "PC-J5000", name: "Drop Leg Jack 5,000 lb", spec: "Square tube · 10 in drop", price: 129 },
    { sku: "PC-JW6", name: "Jack Caster Wheel 6 in", spec: "Fits 2 in tube", price: 24.95 },
  ]),
  c("fenders", "Fenders", "Steel, diamond plate and plastic fenders for single and tandem axles.", "fenders", [
    { sku: "PC-F10S", name: "Single Axle Fender 10 in", spec: "Steel · black", price: 79 },
    { sku: "PC-F15DT", name: "Diamond Plate Tandem Fender", spec: "Fits 15 in tires", price: 189 },
    { sku: "PC-F13P", name: "Plastic Fender 13 in", spec: "Black · pair", price: 64 },
  ]),
  c("guide-poles", "Guide Poles", "Guide-on poles and carpeted guide bunks that line up your boat.", "guidepoles", [
    { sku: "PC-GP40", name: "Guide-On Poles 40 in", spec: "Galvanized · pair", price: 79.95 },
    { sku: "PC-GP60", name: "Guide-On Poles 60 in", spec: "PVC sleeve · pair", price: 99.95 },
    { sku: "PC-GB48", name: "Carpeted Guide Bunks 48 in", spec: "Galvanized uprights · pair", price: 139 },
  ]),
  c("enclosed-trailer", "Enclosed Trailer", "Roof vents, door hardware and hinges for cargo trailers.", "enclosed", [
    { sku: "PC-RV14", name: "Roof Vent 14 in", spec: "Low profile · white", price: 49.95 },
    { sku: "PC-CL1", name: "Cam Lock Door Bar", spec: "Stainless · 1 in", price: 44.95 },
    { sku: "PC-DH4", name: "Door Hinge 4 in", spec: "Black stainless · 4 pack", price: 26.95 },
  ]),
  c("leaf-springs", "Leaf Springs", "Double eye and slipper springs plus hanger kits.", "springs", [
    { sku: "PC-LS3", name: "3-Leaf Double Eye Spring", spec: "25 in · 1,750 lb", price: 34.95 },
    { sku: "PC-LS4", name: "4-Leaf Double Eye Spring", spec: "25 in · 2,550 lb", price: 42.95 },
    { sku: "PC-LSH", name: "Tandem Hanger Kit", spec: "Shackles, bolts, equalizer", price: 69 },
  ]),
  c("towing", "Towing Products", "Couplers, ball mounts and hitch balls to hook up right.", "couplers", [
    { sku: "PC-TC2", name: "2 in A-Frame Coupler", spec: "7,000 lb rated", price: 49.95 },
    { sku: "PC-BM2", name: "Ball Mount 2 in Drop", spec: "2 in receiver · 7,500 lb", price: 39.95 },
    { sku: "PC-HB2", name: "Chrome Hitch Ball 2 in", spec: "1 in shank", price: 19.95 },
  ]),
  c("lights-wiring", "Lights and Wiring", "Sealed LED lights, harnesses and connectors.", "lights", [
    { sku: "PC-LK1", name: "Sealed LED Tail Light Kit", spec: "Submersible · DOT compliant", price: 59.95 },
    { sku: "PC-WH25", name: "4-Way Flat Harness 25 ft", spec: "Trailer end", price: 21.95 },
    { sku: "PC-SM2", name: "Amber LED Side Markers", spec: "Pair · 2 in round", price: 12.95 },
  ]),
  c("mounting-hardware", "Mounting Hardware", "U-bolts, tie plates, shackle straps and grade 8 bolts.", "hardware", [
    { sku: "PC-UB3", name: "U-Bolt Kit for 3 in Round Axle", spec: "4 U-bolts, plates, nuts", price: 24.95 },
    { sku: "PC-SS2", name: "Shackle Straps", spec: "Pair · bolts included", price: 11.95 },
    { sku: "PC-G858", name: "Grade 8 Bolt Kit 5/8 in", spec: "20 pieces", price: 18.95 },
  ]),
  c("boat-marine", "Boat & Marine", "Winches, bow eyes and non-slip deck pads.", "marine", [
    { sku: "PC-MW15", name: "Manual Winch 1,500 lb", spec: "20 ft strap included", price: 64.95 },
    { sku: "PC-DP6", name: "Marine Deck Pad", spec: "Non-slip · gray", price: 34.95 },
    { sku: "PC-BE38", name: "Stainless Bow Eye 3/8 in", spec: "316 stainless", price: 16.95 },
  ]),
  c("trailer-maintenance", "Trailer Maintenance", "Bearing grease, bearing kits and the tools to keep rolling.", "maintenance", [
    { sku: "PC-BG16", name: "Wheel Bearing Grease 16 oz", spec: "Marine grade · red", price: 12.95 },
    { sku: "PC-BK44", name: "Bearing Kit L44649", spec: "Inner, outer and seal", price: 22.95 },
    { sku: "PC-GG1", name: "Pistol Grip Grease Gun", spec: "3,000 psi", price: 29.95 },
  ]),
  c("tie-downs", "Tie-Downs", "Ratchet straps, safety chains and D-rings.", "accessories", [
    { sku: "PC-RS27", name: "Ratchet Strap 2 in x 27 ft", spec: "3,333 lb working load", price: 24.95 },
    { sku: "PC-SC516", name: "Grade 70 Safety Chain 5/16 in", spec: "Clevis hooks · 35 in", price: 39.95 },
    { sku: "PC-DR1", name: "Recessed D-Ring", spec: "1,200 lb · galvanized", price: 9.95 },
  ]),
];

export type CatalogProduct = Product & { category: string; categoryId: string; image: string };

export const allProducts: CatalogProduct[] = categories.flatMap((cat) =>
  cat.products.map((p) => ({ ...p, category: cat.name, categoryId: cat.id, image: cat.image })),
);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function searchProducts(query: string): CatalogProduct[] {
  const q = norm(query);
  if (!q) return [];
  const qc = compact(query);
  const words = q.split(" ");
  return allProducts.filter((p) => {
    if (qc.length >= 3 && compact(p.sku).includes(qc)) return true;
    const hay = norm(`${p.name} ${p.sku} ${p.spec} ${p.category}`);
    return words.every((w) => hay.includes(w));
  });
}

export function formatPrice(n: number): string {
  return `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

/** Client-only: jump to the catalog, from any page, optionally with a category or search. */
export function openCatalog(detail: { category?: string; q?: string }) {
  if (window.location.pathname === "/") {
    window.dispatchEvent(new CustomEvent("pc:catalog", { detail }));
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const params = new URLSearchParams();
  if (detail.q) params.set("q", detail.q);
  if (detail.category) params.set("cat", detail.category);
  const qs = params.toString();
  window.location.href = `/${qs ? `?${qs}` : ""}#catalog`;
}
