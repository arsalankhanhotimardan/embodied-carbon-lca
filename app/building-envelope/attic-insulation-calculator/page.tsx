import type { Metadata } from "next";
import BuildingEnvelopeToolPage from "@/components/building-envelope/BuildingEnvelopeToolPage";

export const metadata: Metadata = {
  title: "Attic Insulation Calculator | R-Value, Depth & Material",
  description: "Calculate attic insulation depth, added R-value, volume, mass and optional bags/packages. Includes optional ENERGY STAR U.S. retrofit guidance and worldwide custom targets.",
  alternates: { canonical: "/building-envelope/attic-insulation-calculator" },
};

export default function Page() {
  return <BuildingEnvelopeToolPage
    title="Attic Insulation Calculator"
    eyebrow="Attic Retrofit Planning"
    intro="Plan an attic insulation top-up from the area, insulation already present, your target R-value, product conductivity and package data. U.S. users can optionally load ENERGY STAR retrofit guidance; all other regions can enter a custom target."
    canonicalPath="/building-envelope/attic-insulation-calculator"
    initialMode="insulation"
    scenario="attic"
    sections={[
      { title: "Existing insulation changes the answer", body: <p>An attic top-up should normally address the thermal-resistance shortfall rather than treating every project as an uninsulated roof. Enter the usable existing R-value/RSI, then the desired total value. Wet, compressed, discontinuous or badly installed insulation may perform below its nominal value and should not be credited blindly.</p> },
      { title: "U.S. climate-zone guidance is optional, not universal", body: <p>The page includes an optional ENERGY STAR retrofit reference for existing wood-framed homes. It is a convenience for U.S. users and is not presented as a worldwide building-code table. Local codes, utility programs and project specifications can require different targets.</p> },
      { title: "Air sealing and moisture still matter", body: <p>Adding insulation can reduce conductive heat transfer, but attic performance also depends on air leakage, ventilation, vapour control, recessed penetrations, moisture conditions and safe clearances around heat-producing equipment. Those details remain project-specific.</p> },
    ]}
    faqs={[
      { question: "Should I subtract my existing attic R-value?", answer: "Yes, if the existing insulation is dry, continuous and still performing. The calculator uses target minus existing resistance to estimate the additional layer needed." },
      { question: "Can I use inches instead of millimetres?", answer: "Yes. Switch to Imperial and the tool displays area in ft², thickness in inches and R-value in the U.S. R-value format." },
      { question: "Does this tell me the exact number of bags?", answer: "It can calculate whole packages when you provide the product's package coverage or package mass. Manufacturer coverage charts should control the final purchase quantity." },
      { question: "Is ENERGY STAR guidance the same as local code?", answer: "Not necessarily. The ENERGY STAR values are a U.S. retrofit guidance reference. Always check the requirements that apply to your location and project." },
    ]}
  />;
}
