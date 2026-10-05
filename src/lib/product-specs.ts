/**
 * Facts and an original description built from a product's own data (name, brand, category).
 * Used when the store has not written a description, so every product page has unique,
 * useful text for shoppers, search engines and AI answer engines.
 */
import { categoryById } from "./categories";

export type Spec = { label: string; value: string };

const FITMENT: Record<string, string> = {
  "tires-wheels": "match the bolt pattern, center bore, wheel size and load rating to your axle and loaded trailer weight",
  "axles-hubs": "measure hub face to hub face, spring centers and the axle rating, and match the bolt pattern of your wheels",
  brakes: "match the brake size, left or right side, the axle capacity and the brake flange bolt pattern",
  "boat-trailer-parts": "measure the frame width and the bunk or roller spacing your hull needs",
  jacks: "check the tongue weight, lift range and mount type (A-frame, swivel or side wind)",
  fenders: "measure the tire diameter and width and the clearance at the mounting point",
  "guide-poles": "measure the trailer frame width and the height you need above the water line",
  "enclosed-trailer": "measure the opening and the hardware hole spacing on your door or panel",
  "leaf-springs": "measure eye-to-eye length, spring width and match the axle capacity",
  towing: "match the ball size, coupler size and the rated capacity of every part in the hitch",
  "lights-wiring": "check the connector type (4-way, 5-way or 7-way), voltage and mounting hole spacing",
  "mounting-hardware": "match bolt diameter, thread pitch and length to the part you are mounting",
  "boat-marine": "check the size and mounting pattern of the fitting you are replacing",
  "trailer-maintenance": "check the bearing numbers, seal size and grease type your hubs use",
  "tie-downs": "match the working load limit to the cargo you are securing",
};

const MATERIALS: [RegExp, string][] = [
  [/hot[- ]dipped galvanized|galvanized|galv\b/i, "Galvanized steel"],
  [/stainless/i, "Stainless steel"],
  [/aluminum|aluminium/i, "Aluminum"],
  [/zinc[- ]plated|zinc/i, "Zinc plated steel"],
  [/chrome/i, "Chrome"],
  [/nylon/i, "Nylon"],
  [/rubber/i, "Rubber"],
  [/polyurethane|poly\b/i, "Polyurethane"],
  [/plastic/i, "Plastic"],
  [/painted|powder coat/i, "Painted steel"],
];

const num = (s: string) => Number(s.replace(/,/g, ""));

export function productSpecs(name: string, brand: string | null): Spec[] {
  const n = ` ${name} `;
  const specs: Spec[] = [];
  const add = (label: string, value: string | undefined | null) => {
    if (value && !specs.some((s) => s.label === label)) specs.push({ label, value });
  };

  if (brand) add("Brand", brand);
  const metric = /\b(ST|P)?(\d{3}\/\d{2}[RD]\d{2})\b/i.exec(n);
  if (metric) add("Tire size", `${metric[1] ? metric[1].toUpperCase() : ""}${metric[2].toUpperCase()}`);
  else if (/tire|wheel/i.test(n)) {
    const inch = /\b(\d{1,2}(?:\.\d+)?) ?x ?(\d{1,2}(?:\.\d+)?)(?:-(\d{1,2}))?\b/i.exec(n);
    if (inch) add("Tire size", `${inch[1]}x${inch[2]}${inch[3] ? `-${inch[3]}` : ""}`);
  }
  if (/\bradial\b/i.test(n)) add("Construction", "Radial");
  else if (/\bbias\b/i.test(n)) add("Construction", "Bias ply");
  const lr = /load range ([A-H])\b/i.exec(n);
  if (lr) add("Load range", lr[1].toUpperCase());
  const ply = /\b(\d{1,2}) ?ply\b/i.exec(n);
  if (ply) add("Ply rating", `${ply[1]} ply`);
  const bolt = /\b(\d) on (\d+(?: \d\/\d)?(?:\.\d+)?)/i.exec(n);
  if (bolt) add("Bolt pattern", `${bolt[1]} on ${bolt[2]} in`);
  const lug = /\b(\d) ?(?:lug|bolt|hole)\b/i.exec(n);
  if (lug) add("Lugs / bolts", lug[1]);
  const wheel = /\b(\d{1,2}) ?(?:inch|in\.?|")\s+(?:\w+\s+){0,4}?(?:wheel|rim|tire)/i.exec(n);
  if (wheel) add("Wheel diameter", `${wheel[1]} in`);
  const brake = /\b(\d{1,2}) ?(?:inch|in\.?|")\s+(?:\w+\s+){0,4}?(?:brake|rotor|drum)/i.exec(n);
  if (brake) add("Brake size", `${brake[1]} in`);
  const lbs = [...n.matchAll(/\b(\d{1,2},\d{3}|\d{3,5}) ?(?:lb|lbs|#|pounds?)\b/gi)].map((m) => num(m[1]));
  const ks = [...n.matchAll(/\b(\d{1,2})k\b/gi)].map((m) => num(m[1]) * 1000);
  // "for 2,000 or 3,500 lb axles": the first number carries no unit, so pick it up too.
  const orPair = /\b(\d{1,2},?\d{3}) or (\d{1,2},?\d{3}) ?lbs?\b/i.exec(n);
  const caps = [...new Set([...(orPair ? [num(orPair[1])] : []), ...lbs, ...ks])].filter((v) => v >= 50).sort((a, b) => a - b);
  if (caps.length) {
    // A rating that comes after "for" describes what the part fits, not what it carries.
    const forAt = n.search(/\bfor\b/i);
    const capAt = n.search(/\b\d{1,2},?\d{3} ?(?:or|lb|lbs|#|pound)|\b\d{1,2}k\b|\b\d{3} ?(?:lb|lbs)\b/i);
    add(forAt >= 0 && capAt > forAt ? "Fits rating" : "Capacity", `${caps.map((v) => v.toLocaleString("en-US")).join(" / ")} lb`);
  }
  const side = /\b(left|right) hand\b/i.exec(n);
  if (side) add("Side", `${side[1][0].toUpperCase()}${side[1].slice(1).toLowerCase()} hand`);
  const ball = /\b(1 7\/8|2 5\/16|2)(?: inch|")? (?:ball|coupler)/i.exec(n);
  if (ball) add("Ball / coupler size", `${ball[1]} in`);
  const bearing = /\b(L\d{5}|LM\d{5,6}|\d{5}[A-Z]?)\b(?=.*bearing)/i.exec(n);
  if (bearing && /bearing/i.test(n)) add("Bearing", bearing[1].toUpperCase());
  const thread = /\b(\d\/\d{1,2})-(\d{2})\b/.exec(n);
  if (thread) add("Thread", `${thread[1]}-${thread[2]}`);
  const pack = /\((\d+)\)|\b(\d+) ?(?:pack|pk|pcs|pieces)\b/i.exec(n);
  if (pack) add("Quantity", `${pack[1] ?? pack[2]} pieces`);
  if (/\bLED\b/.test(n)) add("Lighting", "LED");
  else if (/incandescent/i.test(n)) add("Lighting", "Incandescent");
  if (/waterproof|submersible/i.test(n)) add("Water rating", /submersible/i.test(n) ? "Submersible" : "Waterproof");
  for (const [re, label] of MATERIALS) {
    if (re.test(n)) {
      add("Material / finish", label);
      break;
    }
  }
  return specs;
}

/** A short, original description (2–3 sentences) for a product without one. */
export function productDescription(p: { name: string; partNumber: string; brand: string | null; category: string }): string {
  const cat = categoryById(p.category);
  const specs = productSpecs(p.name, p.brand).filter((s) => s.label !== "Brand");
  const facts = specs.slice(0, 4).map((s) => `${s.label.toLowerCase()} ${s.value}`);
  const showBrand = p.brand && !p.name.toLowerCase().includes(p.brand.toLowerCase());
  const lead = `${p.name}${showBrand ? ` by ${p.brand}` : ""}, part #${p.partNumber}.`;
  const factLine = facts.length ? ` Key specs: ${facts.join("; ")}.` : "";
  const fit = FITMENT[p.category] ? ` Before you order, ${FITMENT[p.category]}.` : "";
  const ship = " Sold by Pristine Custom in Vero Beach, FL, with local delivery priced by distance or free store pickup; we check fitment on every order.";
  void cat;
  return `${lead}${factLine}${fit}${ship}`.trim();
}

export const fitmentTip = (category: string) => FITMENT[category] ?? null;
