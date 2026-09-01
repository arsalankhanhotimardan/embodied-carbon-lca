import type { Metadata } from "next";
import SeoGuideLayout from "@/components/SeoGuideLayout";

const title = "Free Embodied Carbon Calculator for Construction";
const description = "Learn how to calculate construction embodied carbon from CSV or BIM quantities, EPD data, lifecycle modules and building area using a free online workflow.";
const path = "/embodied-carbon-calculator";

export const metadata: Metadata = {
  title: "Free Embodied Carbon Calculator for Construction",
  description,
  alternates: {
    canonical: `https://greenengineeringtools.com${path}`,
  },
  openGraph: {
    title,
    description,
    url: `https://greenengineeringtools.com${path}`,
    type: "article",
  },
};

const sections = [
  {
    "id": "what-it-does",
    "heading": "What an embodied carbon calculator should calculate",
    "paragraphs": [
      "An embodied carbon calculator converts construction quantities into greenhouse-gas impacts, usually reported as kilograms of carbon-dioxide equivalent. For a useful project result, it must do more than multiply one quantity by one carbon factor. The material name has to resolve to an appropriate dataset, the project unit must match the EPD declared basis, and the lifecycle stage being calculated has to be clear.",
      "This calculator is built for construction material schedules rather than one-off household estimates. It can import CSV or BIM-derived quantities, reconcile unknown products, calculate lifecycle modules, compare baseline and proposed models, and normalize results by gross floor area."
    ]
  },
  {
    "id": "workflow",
    "heading": "How to calculate embodied carbon from a material schedule",
    "numbered": [
      "Export or prepare a schedule containing at least material name, quantity and unit.",
      "Upload the CSV and map its columns to material, quantity and unit fields.",
      "Review automatic material matches and resolve unknown names to appropriate EPD or other supported datasets.",
      "Check declared units and correct any conversion warnings before relying on the total.",
      "Enter project-specific transport distance and mode when A4 is required.",
      "Set the building study period and review reference service life for products that may need replacement.",
      "Review A-C results, Module D separately, and any missing-data warnings.",
      "Normalize by gross floor area when comparing carbon intensity between design options."
    ]
  },
  {
    "id": "formula",
    "heading": "Simple A1-A3 calculation example",
    "paragraphs": [
      "Suppose a project contains 100 m³ of a material and the selected EPD reports A1-A3 GWP of 250 kg CO₂e per m³. If the declared quantity is 1 m³ and the units are compatible, the product-stage calculation is 100 × 250 = 25,000 kg CO₂e.",
      "The arithmetic is simple; selecting the correct factor and unit is the difficult part. If the project quantity were in tonnes while the EPD were declared per cubic metre, a density would be required. Without a defensible density, the calculator should stop the conversion rather than return a confident but unsupported number."
    ],
    "callout": {
      "title": "Use the example to understand the formula, not as a default carbon factor",
      "body": "The 250 kg CO₂e/m³ value above is illustrative. Real projects should use an appropriate dataset for the product, geography, specification and declared unit."
    }
  },
  {
    "id": "materials",
    "heading": "Construction materials that can be evaluated",
    "paragraphs": [
      "The workflow is material-agnostic. Concrete, structural steel, reinforcement, timber, insulation, glazing, aluminium, gypsum products, finishes and assemblies can all be evaluated when the project quantity can be related to an appropriate environmental dataset.",
      "For early design, generic datasets may help compare broad options. For procurement, product-specific EPDs can provide more relevant manufacturer or supply-chain information. The source type should remain visible so users can distinguish early assumptions from later product selections."
    ]
  },
  {
    "id": "intensity",
    "heading": "How kg CO₂e/m² helps compare buildings",
    "paragraphs": [
      "A total building result answers how much carbon is associated with the modeled scope. Carbon intensity answers how much impact is associated with each square metre of gross floor area. If the selected A-C result is 2,000,000 kg CO₂e and the building contains 10,000 m², the intensity is 200 kg CO₂e/m².",
      "Intensity is useful for benchmarking, but only when projects use comparable boundaries and assumptions. A structural-only study cannot be fairly compared with a study that includes structure, enclosure, interiors and site hardscape without adjusting the scope."
    ]
  },
  {
    "id": "mistakes",
    "heading": "Common mistakes in construction carbon calculations",
    "bullets": [
      "Multiplying quantities by an EPD factor before checking the declared unit.",
      "Treating a missing EPD module as zero impact.",
      "Using a product-specific EPD for a materially different product or strength class.",
      "Applying one transport distance and weight assumption to every material without review.",
      "Adding Module D directly into A-C without explaining the reporting convention.",
      "Comparing buildings with different floor areas, functions or study periods as if they were equivalent.",
      "Reporting a precise total while a large percentage of the project remains unmapped."
    ]
  },
  {
    "id": "when-use",
    "heading": "When this online calculator is most useful",
    "paragraphs": [
      "The tool is particularly useful during option studies, design development, quantity takeoff review, material procurement and educational analysis. It gives teams a common place to connect quantities, environmental data and lifecycle assumptions.",
      "For formal submissions, treat the calculator as part of a documented professional workflow. Verify EPDs at the source, record project assumptions and use the rules of the applicable certification or reporting framework."
    ]
  }
];
const faqs = [
  {
    "q": "Is this a free embodied carbon calculator for construction materials?",
    "a": "Yes. The browser-based calculator is intended to let users import material quantities and calculate lifecycle carbon without a per-calculation fee. Connected data services may have their own access terms."
  },
  {
    "q": "Can I calculate embodied carbon from a CSV?",
    "a": "Yes. Upload a CSV, map the material, quantity and unit columns, then resolve any unknown materials before reviewing the result."
  },
  {
    "q": "Can the calculator report kg CO₂e per m²?",
    "a": "Yes. Enter gross floor area and the tool can normalize the selected building result to kg CO₂e/m²."
  },
  {
    "q": "Does an embodied carbon calculator replace an LCA professional?",
    "a": "No. It can automate arithmetic and data handling, but project scope, functional equivalence, dataset suitability and formal reporting still require professional judgment."
  }
];
const related = [
  {
    "href": "/a1-a3-embodied-carbon",
    "title": "A1-A3 embodied carbon",
    "description": "Understand product-stage GWP, declared units and practical A1-A3 calculations."
  },
  {
    "href": "/epd-carbon-calculator",
    "title": "EPD carbon calculator",
    "description": "Learn how to read EPD units, GWP values, declared modules and data limitations."
  },
  {
    "href": "/bim-embodied-carbon",
    "title": "BIM embodied carbon workflow",
    "description": "Prepare Revit or BIM quantities for material mapping and lifecycle carbon analysis."
  },
  {
    "href": "/methodology",
    "title": "LCA calculation methodology",
    "description": "See how quantities, units, lifecycle modules, replacements and missing data are handled."
  }
];
const sources = [
  {
    "href": "https://www.buildingtransparency.org/tools/ec3/",
    "label": "Building Transparency — EC3 tool"
  },
  {
    "href": "https://docs.buildingtransparency.org/",
    "label": "Building Transparency documentation — EC3 and tallyLCA scope"
  }
];

export default function Page() {
  return (
    <SeoGuideLayout
      eyebrow="Embodied carbon calculator guide"
      title={title}
      description={description}
      path={path}
      updated="2026-08-31"
      sections={sections}
      faqs={faqs}
      related={related}
      sources={sources}
    />
  );
}
