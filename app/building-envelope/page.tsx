import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Building Envelope Calculators | Insulation, U-Value & Heat Loss",
  description: "Free building-envelope engineering calculators for insulation quantity, R-value, U-value, heat loss, retrofit energy savings and carbon payback. Metric and Imperial, no signup.",
  alternates: { canonical: "/building-envelope" },
};

const tools = [
  { href: "/building-envelope/insulation-calculator", title: "Insulation Calculator", text: "Estimate added R/RSI, thickness, volume, mass, packages and product cost." },
  { href: "/building-envelope/attic-insulation-calculator", title: "Attic Insulation Calculator", text: "Plan attic top-ups with existing insulation, target R-value and optional U.S. ENERGY STAR retrofit guidance." },
  { href: "/building-envelope/blown-in-insulation-calculator", title: "Blown-In Insulation Calculator", text: "Estimate loose-fill depth, volume, mass and bags using product-specific package data." },
  { href: "/building-envelope/wall-insulation-calculator", title: "Wall Insulation Calculator", text: "Estimate wall insulation thickness and quantity, then compare thermal performance and retrofit savings." },
  { href: "/building-envelope/r-value-calculator", title: "R-Value Calculator", text: "Convert R-US, RSI and U-value and build multi-layer thermal assemblies." },
  { href: "/building-envelope/u-value-calculator", title: "U-Value Calculator", text: "Calculate thermal transmittance from material thickness and declared conductivity." },
  { href: "/building-envelope/heat-loss-calculator", title: "Heat Loss Calculator", text: "Calculate fabric and ventilation heat loss, W/K, kW, BTU/h and optional annual degree-day energy." },
  { href: "/building-envelope/carbon-payback-calculator", title: "Insulation Carbon Payback", text: "Compare operational carbon savings with product-specific embodied carbon from EPD/LCA data." },
  { href: "/building-envelope/methodology", title: "Methodology & Data", text: "See equations, scope limits, dataset versions, update policy and authoritative references." },
];

export default function BuildingEnvelopeHub() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Building Envelope Calculators",
    url: "https://greenengineeringtools.com/building-envelope",
    description: "Free building envelope calculators for insulation, thermal performance, heat loss, energy savings and carbon payback.",
  };

  return (
    <div className="min-w-0 bg-gradient-to-b from-emerald-50 via-white to-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <header className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">Free Building Physics Tools</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">Building Envelope & Insulation Calculators</h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">Design and compare walls, roofs and floors; estimate insulation quantity; calculate R-value, U-value and heat loss; then connect retrofit energy savings with embodied carbon. Built for worldwide use with Metric and Imperial units.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-2 text-xs font-black text-slate-600">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2">No signup</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2">Metric + Imperial</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2">Transparent methodology</span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2">Product data can override presets</span>
          </div>
        </header>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href} className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg">
              <h2 className="text-lg font-black text-slate-950 group-hover:text-emerald-700">{tool.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{tool.text}</p>
              <div className="mt-4 text-sm font-black text-emerald-700">Open tool →</div>
            </Link>
          ))}
        </section>

        <section className="mx-auto mt-12 max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Why these tools are different</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div><h3 className="font-black text-slate-900">Physics first</h3><p className="mt-2 text-sm leading-6 text-slate-600">The calculation engine is separate from the user interface and protected by regression tests. Core equations do not silently change when content or datasets are updated.</p></div>
            <div><h3 className="font-black text-slate-900">Product data first</h3><p className="mt-2 text-sm leading-6 text-slate-600">Generic thermal presets are clearly labelled planning values. Declared conductivity, coverage and EPD data from the actual product can replace them.</p></div>
            <div><h3 className="font-black text-slate-900">Carbon connected</h3><p className="mt-2 text-sm leading-6 text-slate-600">Retrofit results can compare operational carbon savings against insulation embodied carbon rather than treating energy and LCA as unrelated calculations.</p></div>
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-5xl rounded-3xl bg-slate-950 p-6 text-slate-200 sm:p-9">
          <h2 className="text-2xl font-black text-white">Designed for worldwide use without pretending one code fits every country</h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">Thermal physics is calculated consistently, while local regulatory targets remain explicit user inputs unless an authoritative regional dataset is provided. The initial regional guidance dataset includes an optional U.S. ENERGY STAR retrofit reference. Users elsewhere can enter the R-value or U-value required by their own project, code or product specification.</p>
          <div className="mt-5 flex flex-wrap gap-3"><Link href="/building-envelope/methodology" className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white hover:bg-emerald-400">Read methodology & update policy</Link><Link href="/building-envelope/u-value-calculator" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/15">Start with U-value calculator</Link></div>
        </section>
      </div>
    </div>
  );
}
