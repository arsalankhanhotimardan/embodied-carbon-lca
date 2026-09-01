import type { Metadata } from "next";
import SeoGuideLayout from "@/components/SeoGuideLayout";

const title = "EPD Carbon Calculator: How to Use EPD Data";
const description = "Use EPD data correctly for embodied carbon calculations. Understand declared units, GWP, lifecycle modules, product-specific data and missing results.";
const path = "/epd-carbon-calculator";

export const metadata: Metadata = {
  title: "EPD Carbon Calculator: How to Use EPD Data",
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
    "id": "what",
    "heading": "What an Environmental Product Declaration tells you",
    "paragraphs": [
      "An Environmental Product Declaration is a standardized disclosure of environmental information for a product or product group. For carbon calculations, users often focus on global warming potential, but a useful EPD also identifies the declared unit, lifecycle modules, product description, geography, program operator, PCR and validity information.",
      "An EPD is not simply a carbon score. It is a structured dataset with a defined scope. The calculator preserves those fields because the context determines whether a number can be used correctly."
    ]
  },
  {
    "id": "read",
    "heading": "Fields to check before using an EPD in a calculator",
    "table": {
      "headers": [
        "EPD field",
        "Why it matters",
        "What to verify"
      ],
      "rows": [
        [
          "Product / manufacturer",
          "Defines what the dataset represents",
          "Make sure it matches the material or acceptable proxy."
        ],
        [
          "Declared unit and quantity",
          "Defines the basis of every reported impact",
          "Align project quantity before multiplying."
        ],
        [
          "Lifecycle modules",
          "Shows which stages are declared",
          "Do not treat non-declared modules as zero."
        ],
        [
          "PCR",
          "Sets product-category calculation rules",
          "Be cautious when comparing products under materially different rules."
        ],
        [
          "Geography / plant",
          "Can affect energy and supply-chain relevance",
          "Prefer data appropriate to the project decision where possible."
        ],
        [
          "Validity date",
          "Shows whether the declaration remains current",
          "Check the original EPD before formal reporting."
        ],
        [
          "Environmental indicators",
          "Defines GWP and other impact results",
          "Use the exact indicator and unit required by the study."
        ]
      ]
    }
  },
  {
    "id": "calculation",
    "heading": "How an EPD carbon calculator uses the data",
    "paragraphs": [
      "The calculator first converts the project quantity to the EPD declared basis. It then applies the impact result for each declared lifecycle module. For example, A1-A3 GWP is multiplied by the normalized quantity for manufacturing impact, while C-stage results are kept in their own lifecycle modules.",
      "A dataset that declares only A1-A3 should not suddenly acquire A4, A5 or C-stage impacts from a generic default. If a project wants to add A4 transportation, it can use a documented transport scenario based on mass, mode and distance."
    ]
  },
  {
    "id": "types",
    "heading": "Product-specific, industry-average and generic datasets",
    "paragraphs": [
      "Product-specific EPDs can support procurement decisions because they describe a manufacturer or product more directly. Industry-average EPDs aggregate a broader set of producers. Generic LCA datasets can be useful when no suitable EPD exists or when the project is still at concept stage.",
      "The right choice depends on the question. Early design often values coverage and consistency; procurement values specificity. A transparent system should label the data source rather than presenting every number as equally specific."
    ]
  },
  {
    "id": "nd",
    "heading": "Why 'not declared' must not become zero",
    "paragraphs": [
      "Some EPDs deliberately do not declare project-specific modules such as A4 or use-stage modules. That absence means there is no reported result for the module in that EPD; it does not prove that the impact is physically zero.",
      "The calculation engine preserves missing values as unavailable. This prevents an incomplete EPD from appearing artificially better than a more complete EPD simply because omitted modules were converted to zero."
    ],
    "callout": {
      "title": "A complete-looking spreadsheet can still be incomplete",
      "body": "If missing modules are filled with zeros, totals become easy to calculate but harder to trust. Preserve data gaps and document how they are resolved."
    }
  },
  {
    "id": "matching",
    "heading": "Matching an EPD to a messy BIM material name",
    "paragraphs": [
      "BIM schedules frequently contain abbreviations, family names, type names or user-entered spelling differences. A material called 'Conc CIP 4ksi' may need to be searched as 'ready mix concrete' or another simplified term to find a relevant EPD.",
      "The tool therefore keeps the original BIM alias separate from the editable EC3 search term. The engineer can correct the search without changing the project record, and an approved mapping can be reused for future imports when permitted by the data source and backend configuration."
    ]
  }
];
const faqs = [
  {
    "q": "What is an EPD carbon calculator?",
    "a": "It is a calculator that uses environmental results reported in an Environmental Product Declaration together with project quantities to estimate impacts for the declared lifecycle modules."
  },
  {
    "q": "Which EPD number is used for embodied carbon?",
    "a": "Global warming potential, reported in kg CO₂e or an equivalent unit, is the primary carbon indicator. The correct lifecycle module and declared unit must also be identified."
  },
  {
    "q": "Does every EPD include A1-D?",
    "a": "No. EPDs can declare different module sets depending on the product category rules and declaration scope. Missing or non-declared modules should not automatically be treated as zero."
  },
  {
    "q": "Can an industry-average EPD be used when a product-specific EPD is unavailable?",
    "a": "It may be appropriate for some study stages, but the choice should be documented. Formal requirements may prefer or require particular data types."
  }
];
const related = [
  {
    "href": "/a1-a3-embodied-carbon",
    "title": "A1-A3 embodied carbon",
    "description": "Understand product-stage GWP, declared units and practical A1-A3 calculations."
  },
  {
    "href": "/ec3-epd-guide",
    "title": "EC3 EPD guide",
    "description": "Use EC3 product search and EPD matching without losing the original BIM material name."
  },
  {
    "href": "/embodied-carbon-calculator",
    "title": "Embodied carbon calculator guide",
    "description": "Learn how to turn a construction material schedule into an auditable carbon result."
  },
  {
    "href": "/whole-building-lca",
    "title": "Whole-building LCA guide",
    "description": "Understand scope, service life, baseline comparison and whole-life reporting."
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
      eyebrow="Environmental Product Declarations"
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
