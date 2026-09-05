import type { Metadata } from "next";
import BuildingEnvelopeToolPage from "@/components/building-envelope/BuildingEnvelopeToolPage";

export const metadata: Metadata = {
  title: "R-Value Calculator | R to RSI, U-Value & Wall Assembly",
  description: "Free R-value calculator to convert R-US, RSI and U-value and calculate multilayer wall, roof and floor thermal resistance from thickness and conductivity.",
  alternates: { canonical: "/building-envelope/r-value-calculator" },
};

export default function Page() {
  return <BuildingEnvelopeToolPage
    title="R-Value Calculator"
    eyebrow="R-US • RSI • U-Value"
    intro="Convert U.S. R-value, SI thermal resistance (RSI) and U-value instantly, then build a complete multilayer wall, roof or floor assembly with editable material properties."
    canonicalPath="/building-envelope/r-value-calculator"
    initialMode="assembly"
    scenario="r-value"
    showConverter="r-us"
    sections={[
      { title: "R-value and RSI measure thermal resistance", body: <p>Higher thermal resistance means less steady-state heat flow through a homogeneous building element. U-value is the inverse of the total SI resistance, so lower U-value means better resistance to heat transfer.</p> },
      { title: "Layer R-values add in series", body: <p>For a simple homogeneous assembly, each layer resistance is thickness divided by thermal conductivity. The engine adds those layer resistances and the selected internal/external surface resistances before calculating the overall U-value.</p> },
      { title: "Framing can reduce the effective R-value", body: <p>A highly conductive framing path bypasses some cavity insulation. The advanced option estimates one repeating framing path using area-weighted parallel conductance. Complex thermal bridges still require dedicated modelling or standard-specific calculations.</p> },
    ]}
    faqs={[
      { question: "How do I convert R-value to RSI?", answer: "Divide the U.S. R-value by approximately 5.67826. The converter performs this directly and also shows the corresponding U-value." },
      { question: "How do I convert RSI to U-value?", answer: "For a complete assembly in SI units, U-value is 1 divided by the total RSI." },
      { question: "Can I add multiple material layers?", answer: "Yes. Add, remove and reorder layers, then enter the actual thickness and thermal conductivity for each layer." },
      { question: "Are windows included in the same calculation?", answer: "ISO 6946's scope excludes windows and other glazed units. Use declared whole-window U-values or an appropriate glazing method for those elements." },
    ]}
  />;
}
