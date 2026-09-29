import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/site/page-shell";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About Us | Pristine Custom" }, { name: "description", content: "Who we are and how we work at Pristine Custom Wheels and Trailer Parts." }] }),
  component: About,
});

const points = [
  { icon: "/assets/icons/measure.png", title: "Fitment first", body: "We ask for your bolt pattern, axle rating and tire size so the part you get is the part that fits." },
  { icon: "/assets/icons/wheel.png", title: "Custom done clean", body: "Chrome and machined wheels, mounted and balanced, for trailers that should look as good as they tow." },
  { icon: "/assets/icons/install.png", title: "Parts for the whole rig", body: "Axles, brakes, springs, lights and hardware, so one order finishes the job." },
];

function About() {
  return (
    <PageShell accent="Us" lede="Pristine Custom sells custom wheels, tires and trailer parts to people who want their rig built right." title="About">
      <div className="pc-about">
        <figure className="pc-about__media pc-glass">
          <img alt="Gloss black tandem axle trailer with chrome wheels in a red-lit showroom" loading="lazy" src="/assets/brand/showroom.webp" />
        </figure>
        <div className="pc-about__copy">
          <h2 className="pc-about__h">Built by trailer people</h2>
          <p>
            A trailer is only as good as the parts under it. We started Pristine Custom to make those parts easy to find and easy to
            get right, from a single bearing kit to a full set of chrome wheels on new tires.
          </p>
          <p>
            Every order gets a fitment check before it ships. If something is off, we call you first instead of shipping the wrong part.
          </p>
          <ul className="pc-about__points">
            {points.map((p) => (
              <li className="pc-glass" key={p.title}>
                <img alt="" height={44} src={p.icon} width={44} />
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
