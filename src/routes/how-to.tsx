import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/site/page-shell";

export const Route = createFileRoute("/how-to")({
  head: () => ({ meta: [{ title: "How To's | Pristine Custom" }, { name: "description", content: "Step by step trailer guides: bolt patterns, bearings, leaf springs and wiring." }] }),
  component: HowTo,
});

const guides = [
  {
    id: "bolt-pattern",
    title: "Measure a bolt pattern",
    image: "/assets/catalog/wheels.webp",
    steps: [
      "Count the lug studs on the hub. Trailers usually run 4, 5, 6 or 8.",
      "4, 6 or 8 lug: measure from the center of one stud to the center of the stud directly across.",
      "5 lug: measure from the center of one stud to the outer edge of the stud farthest across.",
      "Write it as lugs on inches. Five studs on a 4.5 inch circle is 5 on 4.5.",
    ],
  },
  {
    id: "bearings",
    title: "Repack wheel bearings",
    image: "/assets/catalog/maintenance.webp",
    steps: [
      "Lift the trailer and support the frame on jack stands. Never work under a trailer held only by a jack.",
      "Remove the wheel, dust cap, cotter pin and spindle nut, then slide the hub off.",
      "Tap out the grease seal and inner bearing. Clean everything and inspect the races for pitting.",
      "Pack each bearing by hand until grease pushes through the rollers. Install the inner bearing and a new seal.",
      "Refit the hub and outer bearing. Snug the nut while spinning the hub, back it off, then lock it with a new cotter pin.",
    ],
  },
  {
    id: "leaf-springs",
    title: "Replace leaf springs",
    image: "/assets/catalog/springs.webp",
    steps: [
      "Support the frame on jack stands so the axle hangs free, one side at a time.",
      "Remove the U-bolt nuts and tie plate, then the spring eye bolts at the hangers.",
      "Match the new spring's length, leaf count and capacity to the old one before installing.",
      "Bolt the eyes in first, seat the axle, then tighten the U-bolts evenly in a cross pattern.",
    ],
  },
  {
    id: "wiring",
    title: "Wire 4-way trailer lights",
    image: "/assets/catalog/lights.webp",
    steps: [
      "White is ground. Bolt it to clean bare metal on the trailer frame.",
      "Brown runs the tail and marker lights on both sides.",
      "Yellow is the left turn and brake. Green is the right turn and brake.",
      "Seal every connection with heat shrink and test each function with the tow vehicle before the road.",
    ],
  },
];

function HowTo() {
  return (
    <PageShell accent="To's" lede="Straight answers for the jobs trailer owners ask about most." title="How">
      <nav aria-label="Guides" className="pc-toc">
        {guides.map((g) => (
          <a href={`#${g.id}`} key={g.id}>{g.title}</a>
        ))}
      </nav>
      <div className="pc-guides">
        {guides.map((g) => (
          <article className="pc-guide pc-glass" id={g.id} key={g.id}>
            <img alt="" className="pc-guide__img" height={160} loading="lazy" src={g.image} width={160} />
            <div>
              <h2 className="pc-guide__title">{g.title}</h2>
              <ol className="pc-guide__steps">
                {g.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
