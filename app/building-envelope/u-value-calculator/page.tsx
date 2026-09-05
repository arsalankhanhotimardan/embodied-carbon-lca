import type { Metadata } from "next";
import BuildingEnvelopeToolPage from "@/components/building-envelope/BuildingEnvelopeToolPage";

export const metadata: Metadata = {
  title: "U-Value Calculator | Walls, Roofs & Floors",
  description: "Calculate building-element U-value in W/m²K from multiple material layers, thickness and conductivity. Includes surface resistance and optional repeating-framing path.",
  alternates: { canonical: "/building-envelope/u-value-calculator" },
};

export default function Page() {
  return <BuildingEnvelopeToolPage
    title="U-Value Calculator"
    eyebrow="Thermal Transmittance"
    intro="Calculate the overall U-value of a wall, roof or floor from its layer build-up. Enter product-declared thermal conductivity, thickness and optional repeating framing to see the effective thermal resistance and transmittance."
    canonicalPath="/building-envelope/u-value-calculator"
    initialMode="assembly"
    scenario="u-value"
    showConverter="u"
    sections={[
      { title: "What U-value means", body: <p>U-value expresses steady-state heat transfer through one square metre of a building element per kelvin of temperature difference. A lower U-value indicates lower heat transfer, provided the assembly and boundary conditions are represented correctly.</p> },
      { title: "Calculation scope", body: <p>The multilayer method is suitable for planning homogeneous walls, roofs and floors and includes configurable surface resistances. The optional framing feature is a simple parallel-path approximation. The page does not claim to calculate every correction, thermal bridge or regulatory detail required in every jurisdiction.</p> },
      { title: "Use design values, not marketing numbers", body: <p>Where standards require design thermal conductivity rather than a laboratory declared value, use the project-appropriate design value. Moisture, ageing, density and temperature can affect some products.</p> },
    ]}
    faqs={[
      { question: "What is a good U-value?", answer: "There is no single worldwide pass/fail value. Targets vary by climate, element type, building type, code edition and project. Enter the target relevant to your jurisdiction instead of relying on a universal number." },
      { question: "Does a lower U-value mean better insulation?", answer: "Generally yes for steady-state thermal transmittance: lower U-value means less heat flow per unit area and temperature difference." },
      { question: "Can I use Imperial thicknesses?", answer: "Yes. Switch to Imperial and layer thicknesses are entered/displayed in inches while the engine continues to use canonical SI calculations internally." },
      { question: "Why is the framing-adjusted U-value higher?", answer: "Framing usually conducts more heat than cavity insulation, creating a parallel heat-flow path. The area-weighted effective transmittance therefore increases." },
    ]}
  />;
}
