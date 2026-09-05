import type { Metadata } from "next";
import BuildingEnvelopeToolPage from "@/components/building-envelope/BuildingEnvelopeToolPage";

export const metadata: Metadata = {
  title: "Insulation Calculator | R-Value, Thickness, Volume & Cost",
  description: "Free insulation calculator for required R-value/RSI, insulation thickness, volume, estimated mass, package quantity and cost. Metric and Imperial, no signup.",
  alternates: { canonical: "/building-envelope/insulation-calculator" },
};

export default function Page() {
  return <BuildingEnvelopeToolPage
    title="Insulation Calculator"
    eyebrow="Thickness • Quantity • Cost"
    intro="Estimate the additional insulation resistance you need, the corresponding material thickness and volume, and optional package quantity using your product's own coverage or package data."
    canonicalPath="/building-envelope/insulation-calculator"
    initialMode="insulation"
    sections={[
      { title: "How the insulation calculation works", body: <><p>For a homogeneous insulation layer, thermal resistance is calculated from thickness divided by thermal conductivity. The calculator first finds the additional RSI required between the existing and target assembly, then solves the thickness needed for the entered conductivity.</p><p>Package quantities are intentionally optional because bag, batt and board coverage is product-specific. Enter the manufacturer coverage or package mass when you need a purchase estimate.</p></> },
      { title: "Use declared product data for final decisions", body: <p>Thermal conductivity can vary with density, moisture, ageing, temperature and product construction. Preset values are planning defaults only. A professional design should use the declared/design thermal value applicable to the actual product and project.</p> },
      { title: "What this calculator does not assume", body: <p>The tool does not silently choose a building-code target, local energy price or generic embodied-carbon factor. Those values vary by location and product. Keeping them explicit prevents a worldwide calculator from giving a confident-looking but locally wrong result.</p> },
    ]}
    faqs={[
      { question: "How do I calculate insulation thickness from R-value?", answer: "For a homogeneous layer, convert the target thermal resistance to RSI if necessary, subtract existing resistance, then multiply the additional RSI by the material thermal conductivity in W/m·K. The result is thickness in metres." },
      { question: "Why does the package count require product data?", answer: "Loose-fill bag coverage, batt pack coverage and board pack areas differ by manufacturer, density and target R-value. Product coverage is more reliable than a generic universal bag assumption." },
      { question: "Can I use this outside the United States?", answer: "Yes. The core calculation uses SI thermal physics and can display Metric or Imperial values. Enter the target R-value/U-value required by your local project or regulation." },
      { question: "Does the calculator include thermal bridging?", answer: "The Assembly mode includes an optional simple repeating-framing parallel-path estimate. Junctions, point bridges and complex details require more advanced methods." },
    ]}
  />;
}
