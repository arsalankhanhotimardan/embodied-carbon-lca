import type { Metadata } from "next";
import BuildingEnvelopeToolPage from "@/components/building-envelope/BuildingEnvelopeToolPage";

export const metadata: Metadata = {
  title: "Insulation Carbon Payback Calculator | Energy, Cost & CO₂",
  description: "Calculate insulation retrofit energy savings, annual cost savings, financial payback and carbon payback using before/after U-values and product-specific EPD or LCA embodied carbon.",
  alternates: { canonical: "/building-envelope/carbon-payback-calculator" },
};

export default function Page() {
  return <BuildingEnvelopeToolPage
    title="Insulation Carbon Payback Calculator"
    eyebrow="Operational Savings vs Embodied Carbon"
    intro="Compare the embodied carbon added by an insulation retrofit with the operational carbon avoided through lower heat transfer. Use product-specific EPD/LCA data instead of an invisible generic carbon factor."
    canonicalPath="/building-envelope/carbon-payback-calculator"
    initialMode="retrofit"
    scenario="carbon"
    sections={[
      { title: "What carbon payback means", body: <p>Carbon payback is the time required for estimated annual operational greenhouse-gas savings to equal the embodied greenhouse-gas emissions attributed to the retrofit. A short payback can indicate that the operational benefit quickly exceeds the upfront carbon burden, but the result depends strongly on climate, energy source and EPD scope.</p> },
      { title: "Keep EPD units and modules consistent", body: <p>If you use a product EPD factor, confirm the declared unit and life-cycle modules. The calculator's mass × factor input expects a compatible kgCO₂e per kg factor. If your EPD is declared per m², m³, piece or another unit, calculate the project embodied carbon in the EPD Carbon Calculator first and enter the total here.</p> },
      { title: "Decarbonising grids change long-term carbon savings", body: <p>A single operational carbon factor is a planning simplification. Electricity grids and heating fuels can change over a 20-year analysis. For high-stakes studies, use scenario-based or year-by-year carbon factors in a dedicated LCA/energy model.</p> },
    ]}
    faqs={[
      { question: "What data do I need for carbon payback?", answer: "You need before/after U-values, area, climate degree days, system performance, an operational-energy carbon factor and insulation/project embodied carbon from a compatible EPD or LCA result." },
      { question: "Does the tool contain generic insulation carbon factors?", answer: "No. Product, geography, declared unit and EPD scope can change the result substantially, so no generic factor is silently applied." },
      { question: "Can I calculate financial payback too?", answer: "Yes. Enter the local energy price and upgrade cost. The calculator reports simple annual cost savings and simple payback when enough inputs are available." },
      { question: "Can I connect this to Green Engineering Tools LCA?", answer: "Yes. The page links to the existing EPD and embodied-carbon calculators so you can calculate product/project carbon with the appropriate declared unit, then bring the total into the payback tool." },
    ]}
  />;
}
