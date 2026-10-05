const values = [
  { icon: "/assets/icons/sm/measure.webp", title: "Fitment checked", body: "Send your bolt pattern or axle specs. We confirm the match before anything ships." },
  { icon: "/assets/icons/sm/install.webp", title: "Install-ready kits", body: "Hubs, bearings, lugs and hardware grouped so the job gets done in one trip." },
  { icon: "/assets/icons/sm/shipping.webp", title: "Delivered your way", body: "Local delivery priced by the mile from Vero Beach, or free pickup at our shop." },
  { icon: "/assets/icons/sm/quality.webp", title: "Brands you know", body: "Dexter, Kodiak, Dutton-Lainson, LoadStar, Demco and more, all searchable by part number." },
];

export function ValueRail() {
  return (
    <section className="pc-section pc-values" aria-label="Why Pristine Custom">
      <div className="pc-wrap">
        <ul className="pc-rail pc-glass">
          {values.map((v) => (
            <li className="pc-rail__item" key={v.title}>
              <img alt="" className="pc-rail__icon" height={52} src={v.icon} width={52} />
              <div>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
