import { FitmentLink } from "./ctas";

const steps = [
  { n: "01", title: "Bolt pattern", body: "Count the lugs and measure across the circle. Five lugs on a 4.5 inch circle reads as 5 on 4.5." },
  { n: "02", title: "Axle rating", body: "Find the capacity on the axle tag or the trailer VIN plate, for example 3,500 lb." },
  { n: "03", title: "Tire size", body: "Read the sidewall. ST205/75R15 is a 15 inch trailer tire, 205 mm wide." },
];

export function FitmentGuide() {
  return (
    <section id="fitment" className="pc-section" aria-labelledby="fit-title">
      <div className="pc-wrap pc-fit__grid">
        <figure className="pc-fit__media pc-glass">
          <img
            alt="ST225/75R15 trailer tire sidewall showing size and load rating on a black machined wheel"
            decoding="async"
            height={1050}
            loading="lazy"
            src="/assets/shop/tire-sidewall.webp"
            width={1400}
          />
        </figure>
        <div>
          <h2 id="fit-title" className="pc-display">
            Measure once. <span className="pc-red-text">Order right.</span>
          </h2>
          <p className="pc-lede">Three numbers get you the right part the first time.</p>
          <ol className="pc-steps">
            {steps.map((s) => (
              <li key={s.n}>
                <span className="pc-steps__n">{s.n}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <FitmentLink />
        </div>
      </div>
    </section>
  );
}
