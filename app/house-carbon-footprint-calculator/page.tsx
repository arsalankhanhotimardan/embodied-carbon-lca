import type { Metadata } from "next";
import Link from "next/link";
import ToolPageShell from "@/components/ToolPageShell";
import HouseCarbonTool from "@/components/carbon/HouseCarbonTool";
import { BENCHMARK_OPTIONS, FT2_PER_M2, LETI_RESIDENTIAL, SOURCES, optionById } from "@/data/house-carbon-benchmarks";

const path = "/house-carbon-footprint-calculator";

export const metadata: Metadata = {
  title: "House Carbon Footprint Calculator | Embodied Carbon of Building a Home",
  description:
    "Estimate the embodied carbon of building a house from floor area and structure type. Free screening calculator with sourced benchmarks for timber, SIPs and masonry homes, ranges and LETI targets.",
  alternates: { canonical: path },
  openGraph: {
    title: "House Carbon Footprint Calculator",
    description: "How many tonnes of CO₂e does it take to build a house? Estimate it from floor area and structure type.",
    url: `https://greenengineeringtools.com${path}`,
    type: "website",
  },
};

const houses = ["house-timber", "house-sips", "house-masonry"].map((id) => optionById(id)!);
const sizesM2 = [80, 100, 150, 200, 250, 300];
const sizesFt2 = [1000, 1500, 2000, 2500, 3000, 4000];
const t = (kgPerM2: number, m2: number) => ((kgPerM2 * m2) / 1000).toFixed(1);

const timber = optionById("house-timber")!;
const masonry = optionById("house-masonry")!;
const m2of2000 = 2000 / FT2_PER_M2;

export default function HouseCarbonPage() {
  const faqs = [
    {
      question: "What is the carbon footprint of building a house?",
      answer: `Published studies of new houses report roughly ${timber.typical}–${masonry.typical} kgCO₂e per m² for the product stage alone (A1–A3), depending on the structure. For a 150 m² house that is about ${t(timber.typical, 150)}–${t(masonry.typical, 150)} tonnes of CO₂e before transport, construction, use and end of life.`,
    },
    {
      question: "How many tonnes of CO₂ does it take to build a 2,000 sq ft house?",
      answer: `2,000 sq ft is about ${m2of2000.toFixed(0)} m². At ${timber.typical}–${masonry.typical} kgCO₂e/m² (A1–A3) that is roughly ${t(timber.typical, m2of2000)}–${t(masonry.typical, m2of2000)} tonnes of CO₂e, depending on whether the house is timber frame or masonry.`,
    },
    {
      question: "Is a timber house really lower in embodied carbon than brick?",
      answer: `In the UK Passivhaus comparison used here, the timber frame house came out at ${timber.typical} kgCO₂e/m² against ${masonry.typical} for masonry, about ${Math.round((1 - timber.typical / masonry.typical) * 100)}% lower. Results vary with design, so check the products you will actually use. Note that biogenic carbon storage is treated differently between studies.`,
    },
    {
      question: "What is embodied carbon?",
      answer: "Embodied carbon is the greenhouse-gas emissions from making and installing building materials, plus transport, construction, maintenance and demolition. It is separate from operational carbon, which comes from heating, cooling and electricity use.",
    },
    {
      question: "What do A1–A3 and A1–A5 mean?",
      answer: "They are life-cycle stages from EN 15978. A1–A3 is the product stage (raw materials, transport to the factory, manufacturing). A4–A5 add transport to site and construction. A1–A5 is often called upfront carbon.",
    },
    {
      question: "How accurate is this estimate?",
      answer: "It is a screening estimate from published benchmarks, so expect a spread of at least ±30% for a real design. A material-by-material life cycle assessment using EPDs is far more accurate and is what the main calculator on this site does.",
    },
  ];

  return (
    <ToolPageShell
      title="House Carbon Footprint Calculator"
      appName="House Carbon Footprint Calculator"
      eyebrow="Embodied carbon of building a home"
      intro="Enter your floor area and structure type to see roughly how many tonnes of CO₂e it takes to build the house, with a range and a comparison to LETI's low-carbon targets."
      description="Screening estimate of the embodied carbon of building a house or building from floor area and structure type, using published benchmark studies."
      path={path}
      crumbs={[{ label: "Embodied carbon", href: "/embodied-carbon-calculator" }]}
      tool={<HouseCarbonTool />}
      faqs={faqs}
      related={[
        { href: "/embodied-carbon-calculator", title: "Embodied carbon calculator guide" },
        { href: "/#calculator-workspace", title: "Full LCA calculator from your own materials" },
        { href: "/a1-a3-embodied-carbon", title: "A1–A3 embodied carbon explained" },
        { href: "/epd-carbon-calculator", title: "How to use EPDs in calculations" },
        { href: "/building-envelope/carbon-payback-calculator", title: "Insulation carbon payback calculator" },
        { href: "/whole-building-lca", title: "Whole-building LCA guide" },
      ]}
      disclaimer={
        <>
          <strong>Screening estimate, not an LCA.</strong> Results come from a small number of published studies with different scopes, sites and assumptions. They are suitable for early comparison and awareness, not for compliance, certification or reporting. For design decisions, use a material-based assessment with product EPDs.
        </>
      }
    >
      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">How the estimate works</h2>
        <p className="mt-3 leading-7">
          The calculator multiplies your floor area by a benchmark intensity, in kgCO₂e per m², for the building type you choose. Each benchmark comes from a published study and is shown with its life-cycle scope, a low–typical–high range and a confidence label so you can see how far to trust it. Nothing you enter leaves your browser.
        </p>
        <p className="mt-3 leading-7">
          The three house options come from one UK study of a 160 m² Passivhaus-standard home built three ways, which makes the comparison between them fairer than mixing unrelated projects. The apartment, commercial and warehouse values are broader averages and carry a wider uncertainty.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Carbon footprint of a house by size</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Typical product-stage (A1–A3) embodied carbon in tonnes of CO₂e, from the benchmarks above.</p>
        {[
          { label: "By floor area in m²", sizes: sizesM2, unit: "m²", toM2: (s: number) => s },
          { label: "By floor area in square feet", sizes: sizesFt2, unit: "sq ft", toM2: (s: number) => s / FT2_PER_M2 },
        ].map((table) => (
          <div key={table.label} className="mt-5">
            <h3 className="font-black text-slate-900">{table.label}</h3>
            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Floor area</th>
                    {houses.map((h) => (
                      <th key={h.id} className="px-3 py-2 text-right">{h.label.replace("House: ", "")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.sizes.map((s) => (
                    <tr key={s} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-black text-slate-900">{s.toLocaleString("en-US")} {table.unit}</td>
                      {houses.map((h) => (
                        <td key={h.id} className="px-3 py-2 text-right">{t(h.typical, table.toM2(s))} t</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Benchmarks used</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Scope</th>
                <th className="px-3 py-2 text-right">Low</th>
                <th className="px-3 py-2 text-right">Typical</th>
                <th className="px-3 py-2 text-right">High</th>
                <th className="px-3 py-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {BENCHMARK_OPTIONS.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-black text-slate-900">{o.label}</td>
                  <td className="px-3 py-2">{o.scope}</td>
                  <td className="px-3 py-2 text-right">{o.low}</td>
                  <td className="px-3 py-2 text-right font-black">{o.typical}</td>
                  <td className="px-3 py-2 text-right">{o.high}</td>
                  <td className="px-3 py-2">{o.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          kgCO₂e per m² of gross internal floor area. LETI residential targets for comparison (A1–A5): {LETI_RESIDENTIAL.y2020} for 2020 and {LETI_RESIDENTIAL.y2030} for 2030. Because the house benchmarks are A1–A3 only, they sit below the full A1–A5 scope the targets use.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">What counts as embodied carbon</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-7">
          <li><strong>A1–A3 product stage:</strong> raw material extraction, transport to the factory and manufacturing. Usually the largest share.</li>
          <li><strong>A4–A5 construction:</strong> transport to site, plant, waste and site energy.</li>
          <li><strong>B1–B5 use stage:</strong> maintenance, repair and replacement of materials over the building&apos;s life.</li>
          <li><strong>C1–C4 end of life:</strong> demolition, waste transport and disposal.</li>
          <li><strong>Operational carbon</strong> from heating, cooling and electricity is separate and not part of embodied carbon.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">How to lower the embodied carbon of a house</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-7">
          <li><strong>Use less material.</strong> A simpler, more compact form and efficient structural spans cut quantities in every category.</li>
          <li><strong>Choose lower-carbon structure.</strong> In the comparison above, timber frame is about a third lower than masonry. Check the product EPDs for what you will actually buy.</li>
          <li><strong>Cut cement.</strong> Foundations and slabs are often the largest concrete uses. Specify cement replacement such as GGBS or fly ash where the engineer allows, and avoid over-thick slabs.</li>
          <li><strong>Pick insulation and cladding with EPDs.</strong> In a Canadian study of typical houses, concrete, insulation and cladding were the three most emission-intensive material groups, so product choice there matters most.</li>
          <li><strong>Keep what already exists.</strong> Retrofit and reuse can avoid much of the new-build product-stage carbon.</li>
        </ul>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Want to compare options with real product data? Use the <Link href="/#calculator-workspace" className="font-bold text-emerald-700 underline underline-offset-2">LCA calculator</Link>, or read the <Link href="/epd-carbon-calculator" className="font-bold text-emerald-700 underline underline-offset-2">EPD guide</Link>.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Sources and limits</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6">
          {SOURCES.map((s) => (
            <li key={s.label}>{s.href ? <a href={s.href} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-700 underline underline-offset-2">{s.label}</a> : s.label}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Published benchmarks differ in scope, climate, building codes and data sources. Low and high values for the house options are an illustrative spread of −20% and +30% around the cited figure, not a statistical interval. Please treat every number here as an order-of-magnitude guide.
        </p>
      </section>
    </ToolPageShell>
  );
}
