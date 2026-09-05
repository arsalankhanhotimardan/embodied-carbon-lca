import type { Metadata } from "next";
import BuildingEnvelopeToolPage from "@/components/building-envelope/BuildingEnvelopeToolPage";

export const metadata: Metadata = {
  title: "Wall Insulation Calculator | R-Value, Thickness & U-Value",
  description: "Calculate wall insulation thickness, added R-value, material volume and whole-wall U-value. Includes optional repeating-framing path and Metric/Imperial units.",
  alternates: { canonical: "/building-envelope/wall-insulation-calculator" },
};

export default function Page() {
  return <BuildingEnvelopeToolPage
    title="Wall Insulation Calculator"
    eyebrow="Wall Retrofit & Assembly Planning"
    intro="Estimate insulation thickness and material quantity for a wall, then switch to the assembly tool to see how masonry, sheathing, framing and finishes affect the overall U-value."
    canonicalPath="/building-envelope/wall-insulation-calculator"
    initialMode="insulation"
    scenario="general"
    sections={[
      { title: "Cavity insulation is not the same as whole-wall performance", body: <p>A high R-value in the insulated cavity does not automatically mean the whole wall achieves the same resistance. Framing, concrete, masonry ties, fixings and junctions can bypass insulation. Use the Assembly mode when you need an overall layer-by-layer U-value rather than only an insulation thickness.</p> },
      { title: "Subtract openings from the insulation area", body: <p>For material quantity, use the net wall area that will actually receive insulation. Large windows and doors should normally be excluded from insulation quantity, while their own U-values should be included separately in a building heat-loss calculation.</p> },
      { title: "Choose the project target locally", body: <p>Wall U-value and R-value targets vary by jurisdiction, climate, building type and whether the work is new construction or retrofit. The calculator keeps the target editable instead of hard-coding a worldwide pass/fail value.</p> },
    ]}
    faqs={[
      { question: "How much wall insulation do I need?", answer: "Enter net wall area, existing wall resistance, target resistance and the insulation product's thermal conductivity. The calculator estimates the added thickness, volume and optional package count." },
      { question: "How do studs affect wall R-value?", answer: "Studs create a parallel heat-flow path through the insulated layer. The Assembly mode includes a simple repeating-framing approximation so you can see how framing fraction changes effective U-value." },
      { question: "Should I include windows in wall insulation area?", answer: "Usually not for insulation quantity. Treat windows and doors as separate elements in the Heat Loss tool using their whole-unit U-values." },
      { question: "Can I use mineral wool, PIR or EPS?", answer: "Yes. The tool includes editable planning presets for common materials. Replace the preset conductivity with the selected product's declared/design value for a real project." },
    ]}
  />;
}
