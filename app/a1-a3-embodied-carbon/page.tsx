import type { Metadata } from "next";
import SeoGuideLayout from "@/components/SeoGuideLayout";

const title = "A1-A3 Embodied Carbon Calculator & EPD Guide";
const description = "Calculate A1-A3 embodied carbon from EPD data correctly. Learn declared units, product-stage modules, quantity conversion and fair material comparison.";
const path = "/a1-a3-embodied-carbon";

export const metadata: Metadata = {
  title: "A1-A3 Embodied Carbon Calculator & EPD Guide",
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
    "id": "definition",
    "heading": "What A1, A2 and A3 mean in an EPD",
    "paragraphs": [
      "A1-A3 are the product-stage modules most commonly encountered when comparing the upfront manufacturing impact of construction materials. A1 covers raw material supply, A2 covers transport associated with supplying those inputs to manufacturing, and A3 covers manufacturing processes. Many EPDs report a combined A1-A3 value rather than three separate numbers.",
      "A1-A3 is therefore a useful starting point for procurement and early embodied-carbon studies, but it is not automatically the whole life of the product. Project delivery, installation, maintenance, replacement, demolition and waste processing may sit in later modules."
    ],
    "table": {
      "headers": [
        "Module",
        "Plain-language meaning",
        "Typical question"
      ],
      "rows": [
        [
          "A1",
          "Raw material supply",
          "What impacts are associated with obtaining the material inputs?"
        ],
        [
          "A2",
          "Transport to manufacturing",
          "What impacts occur moving inputs to the manufacturing facility?"
        ],
        [
          "A3",
          "Manufacturing",
          "What impacts occur while producing the construction product?"
        ]
      ]
    }
  },
  {
    "id": "calculate",
    "heading": "How to calculate A1-A3 embodied carbon",
    "paragraphs": [
      "The core calculation is project quantity expressed in the EPD declared basis multiplied by the A1-A3 GWP per declared quantity. If an EPD declares 1 tonne and the project contains 50 tonnes of the same product basis, multiply the factor by 50. If the EPD declares 1 m³ and the schedule is in tonnes, first convert using an appropriate density.",
      "Do not convert by intuition. A concrete quantity reported by volume cannot be multiplied directly by a factor reported per kilogram. Likewise, a square-metre EPD may depend on a particular product thickness or assembly definition."
    ]
  },
  {
    "id": "declared-unit",
    "heading": "Declared unit is as important as the GWP number",
    "paragraphs": [
      "A GWP value without its declared unit is incomplete information. Two EPDs may both show a number called A1-A3 GWP, but one may be per kilogram and another per cubic metre. The magnitude of the number cannot be compared until the basis is aligned.",
      "The calculation engine therefore stores declared quantity and unit with the environmental result. Straight unit conversions are automated where possible, while mass-volume and area-volume conversions require the relevant physical properties."
    ]
  },
  {
    "id": "compare",
    "heading": "How to compare two A1-A3 EPD results fairly",
    "bullets": [
      "Check that the products perform the same function for the design decision being made.",
      "Align declared units before comparing GWP values.",
      "Review product strength, density, thickness, grade or other specification that affects functional equivalence.",
      "Check EPD geography, validity, PCR and manufacturer when those factors matter to procurement.",
      "Do not assume that a lower A1-A3 number guarantees a lower whole-life result if replacement or end-of-life scenarios differ."
    ]
  },
  {
    "id": "scope",
    "heading": "What A1-A3 does not include",
    "paragraphs": [
      "A1-A3 normally stops at the factory gate. Transportation from the manufacturer to the construction site is A4, while installation is A5. Use-stage impacts sit in B modules, end of life in C modules, and potential benefits or loads beyond the system boundary in Module D.",
      "That distinction matters when people search for an 'A1-A3 carbon calculator' and then use the result as if it were the entire building lifecycle. A1-A3 can be an excellent procurement metric, but whole-building decisions often need a broader boundary."
    ]
  },
  {
    "id": "tool",
    "heading": "Using the A1-A3 calculator with CSV or BIM quantities",
    "paragraphs": [
      "Upload a material schedule, resolve each material to a dataset, and review any unit-conversion warnings. The manufacturing view can then aggregate A1-A3 by material and by building model. Baseline and proposed models can also be compared using the same data and boundary.",
      "For transparent reporting, keep the dataset identity and declared unit attached to every result. This makes it possible to trace a building total back to the material records that created it."
    ]
  }
];
const faqs = [
  {
    "q": "What is the formula for A1-A3 embodied carbon?",
    "a": "Convert the project quantity to the EPD's declared basis, divide by the EPD declared quantity when needed, and multiply by the A1-A3 GWP reported for that basis."
  },
  {
    "q": "Is A1-A3 the same as upfront carbon?",
    "a": "Not always. Upfront carbon commonly includes more than product-stage manufacturing; depending on the framework it may also include transport to site and construction-stage impacts such as A4 and A5."
  },
  {
    "q": "Can I compare A1-A3 values from two EPDs directly?",
    "a": "Only after checking functional equivalence, declared units and relevant product specifications. A smaller printed number does not necessarily mean a lower-impact equivalent product."
  },
  {
    "q": "What if an EPD shows A1, A2 and A3 separately?",
    "a": "Use the declared module results according to your methodology. If your report requires a combined A1-A3 value, sum compatible results from A1, A2 and A3 without changing their units or indicator definitions."
  }
];
const related = [
  {
    "href": "/embodied-carbon-calculator",
    "title": "Embodied carbon calculator guide",
    "description": "Learn how to turn a construction material schedule into an auditable carbon result."
  },
  {
    "href": "/epd-carbon-calculator",
    "title": "EPD carbon calculator",
    "description": "Learn how to read EPD units, GWP values, declared modules and data limitations."
  },
  {
    "href": "/ec3-epd-guide",
    "title": "EC3 EPD guide",
    "description": "Use EC3 product search and EPD matching without losing the original BIM material name."
  },
  {
    "href": "/methodology",
    "title": "LCA calculation methodology",
    "description": "See how quantities, units, lifecycle modules, replacements and missing data are handled."
  }
];
const sources = [
  {
    "href": "https://docs.buildingtransparency.org/",
    "label": "Building Transparency documentation — EC3 and tallyLCA scope"
  },
  {
    "href": "https://www.buildingtransparency.org/tools/ec3/",
    "label": "Building Transparency — EC3 tool"
  }
];

export default function Page() {
  return (
    <SeoGuideLayout
      eyebrow="A1-A3 product-stage carbon"
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
