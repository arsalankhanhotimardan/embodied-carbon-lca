import type { Metadata } from "next";
import BuildingEnvelopeToolPage from "@/components/building-envelope/BuildingEnvelopeToolPage";

export const metadata: Metadata = {
  title: "Blown-In Insulation Calculator | Bags, Depth & R-Value",
  description: "Estimate blown-in insulation depth, volume, mass, bags and cost for cellulose or loose-fill fiberglass using product-specific density and coverage data.",
  alternates: { canonical: "/building-envelope/blown-in-insulation-calculator" },
};

export default function Page() {
  return <BuildingEnvelopeToolPage
    title="Blown-In Insulation Calculator"
    eyebrow="Loose-Fill Depth • Bags • Cost"
    intro="Estimate loose-fill insulation depth and quantity without hiding product assumptions. Use cellulose or loose-fill fiberglass planning presets, then replace density and package coverage with the values printed on the actual product label."
    canonicalPath="/building-envelope/blown-in-insulation-calculator"
    initialMode="insulation"
    scenario="blown"
    sections={[
      { title: "Why product coverage matters for blown insulation", body: <p>Loose-fill products are installed to specified coverage and depth at a particular density. A bag count derived from one generic density can be wrong for another product. This calculator therefore gives the thermal thickness and volume independently, then lets the selected product's coverage or package mass drive the purchase count.</p> },
      { title: "Settled depth versus installed depth", body: <p>Settlement behavior depends on the product and installation method. The ordering/installation allowance is editable rather than hard-coded. Use the manufacturer's coverage chart and installed/settled depth instructions where those values are provided.</p> },
      { title: "Use the result as a planning quantity, not an installation certificate", body: <p>Actual installed performance can be affected by uneven depth, wind washing, compression, moisture, obstructions and air leakage. Inspect the completed installation and follow product and local safety requirements.</p> },
    ]}
    faqs={[
      { question: "How many bags of blown-in insulation do I need?", answer: "Enter the area, existing and target R-values, product thermal value and either the product's coverage per bag or installed density plus package mass. The calculator rounds package quantities up to whole units." },
      { question: "Does cellulose always settle by the same percentage?", answer: "No. Settlement and installed density are product- and application-specific. Use the product's coverage chart or installation instructions rather than assuming one universal percentage." },
      { question: "Can the calculator handle existing insulation?", answer: "Yes. Enter the existing R-value/RSI and the desired total target. Only the shortfall is used to calculate additional thickness." },
      { question: "Can I calculate cost?", answer: "Yes. Once a package count is available, enter the local package price and a currency label to obtain a simple material-cost estimate." },
    ]}
  />;
}
