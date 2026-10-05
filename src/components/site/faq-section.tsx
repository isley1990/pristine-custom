export const FAQS = [
  {
    q: "How do I find the right trailer part?",
    a: "Search by the part number stamped on your old part, or browse by category. If you're not sure, send a quote request with your trailer type, bolt pattern, axle rating and tire size and we confirm the fit before anything ships.",
  },
  {
    q: "How do I measure a trailer bolt pattern?",
    a: "Count the lug studs. On 4, 6 and 8 lug hubs measure center to center across two opposite studs. On 5 lug hubs measure from the center of one stud to the outer edge of the stud farthest across. Five studs on a 4.5 inch circle is written 5 on 4.5.",
  },
  {
    q: "What does ST mean on a trailer tire?",
    a: "ST stands for Special Trailer. ST tires have stiffer sidewalls and higher load ratings than passenger tires of the same size, which is why trailers should run ST tires. ST205/75R15 is a 15 inch trailer radial, 205 mm wide.",
  },
  {
    q: "Why do some parts say Call for price?",
    a: "Prices on some parts change with supplier costs and freight. Call or text (954) 797-1123, or add them to your cart and send a quote request. We reply with the current price, fitment confirmation and shipping.",
  },
  {
    q: "How much is delivery?",
    a: "Delivery is priced by road distance from our shop in Vero Beach, FL: a base fee covers the first miles, then a per-mile rate. Enter your address at checkout to see the exact fee before you pay. Store pickup is always free.",
  },
  {
    q: "How can I pay?",
    a: "Pay by debit or credit card at checkout (Visa, Mastercard, American Express, Discover), processed securely by Stripe. You can also place the order and pay at pickup or by phone. Questions? Call or text (954) 797-1123.",
  },
  {
    q: "Do you sell complete trailer axles and mounted tire and wheel assemblies?",
    a: "Yes. We carry complete galvanized and painted axles from brands like Dexter and Autoflex-Knott, plus tires mounted and balanced on aluminum, galvanized and painted wheels from 8 to 16 inches.",
  },
  {
    q: "Which brands do you carry?",
    a: "Dexter, Kodiak, Demco, Dutton-Lainson, LoadStar, TecNiq, Autoflex-Knott, CE Smith, Stoltz, RAM, Fulton and more across 15 categories.",
  },
];

export const faqJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

export function FaqSection() {
  return (
    <section aria-labelledby="faq-title" className="pc-section pc-faq" id="faq">
      <div className="pc-wrap">
        <h2 className="pc-display" id="faq-title">
          Trailer parts <span className="pc-red-text">questions</span>
        </h2>
        <div className="pc-faq__list">
          {FAQS.map((f) => (
            <details className="pc-faq__item pc-glass" key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
