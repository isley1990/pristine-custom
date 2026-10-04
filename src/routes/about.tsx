import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/site/page-shell";
import { breadcrumbJsonLd, pageHead } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () =>
    pageHead({
      title: "About Us",
      description: "Pristine Custom sells custom trailer wheels, tires and 2,300+ trailer parts, with a fitment check on every order.",
      path: "/about",
      image: "/assets/shop/wheel-set.webp",
      jsonLd: [breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About Us", path: "/about" }])],
    }),
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
          <img alt="Four new ST225/75R15 trailer tires mounted on black machined aluminum wheels" height={1400} loading="lazy" src="/assets/shop/wheel-set.webp" width={1050} />
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
          <div className="pc-gallery">
            <img alt="Machined black trailer wheels stacked in the shop" height={1400} loading="lazy" src="/assets/shop/wheel-stock.webp" width={1050} />
            <img alt="Galvanized trailer axles with hubs ready to ship" height={1400} loading="lazy" src="/assets/shop/axles-stock.webp" width={1050} />
            <img alt="Five lug galvanized trailer hub with wheel studs" height={1400} loading="lazy" src="/assets/shop/hub-studs.webp" width={1050} />
          </div>
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
