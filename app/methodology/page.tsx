import type { Metadata } from "next";
import SeoGuideLayout from "@/components/SeoGuideLayout";

const title = "Building LCA Methodology: Embodied Carbon A1-D";
const description = "A transparent building LCA methodology for quantities, EPD units, A1-A3, A4, B4 replacements, C1-C4, Module D, baseline comparison and data quality.";
const path = "/methodology";

export const metadata: Metadata = {
  title: "Building LCA Methodology: Embodied Carbon A1-D",
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
    "id": "purpose",
    "heading": "What this LCA methodology is designed to do",
    "paragraphs": [
      "The Green Engineering Tools calculation methodology is designed to turn project material quantities into transparent lifecycle results without hiding the assumptions that materially affect the answer. A quantity is only useful when it is tied to a unit, a material or EPD dataset, a declared quantity, a lifecycle boundary and a study period. The engine therefore treats material resolution and unit compatibility as part of the calculation rather than as an administrative step.",
      "The methodology is intended for design studies, embodied-carbon screening, EPD-based comparisons, baseline-versus-proposed analysis and structured reporting. It is not a substitute for professional judgment or a certification decision. Formal reports should be reviewed against the standard, rating system and project-specific requirements that apply to the work."
    ]
  },
  {
    "id": "data-hierarchy",
    "heading": "Data hierarchy: prefer traceable datasets over convenient guesses",
    "paragraphs": [
      "A professional LCA workflow should make the source of each environmental factor visible. Product-specific EPD data can be valuable when the product, geography, declared unit and scope are appropriate. Industry-average or generic datasets can still be useful in early design, but they should be identified as such so users understand the level of specificity behind the result.",
      "The calculator intentionally treats an unmapped material as unresolved. It does not create a default manufacturing value, default end-of-life value or fabricated impact category merely to complete the total. That behavior is important because a visually complete result can be more misleading than an explicit data gap."
    ],
    "bullets": [
      "Keep the dataset ID or source reference with the calculated material.",
      "Preserve the manufacturer, declared unit, declared quantity and available lifecycle modules.",
      "Keep missing environmental indicators unavailable rather than changing them to zero.",
      "Retain the original BIM or CSV material alias even when the engineer searches EC3 using a corrected or simplified name."
    ]
  },
  {
    "id": "units",
    "heading": "Quantity normalization and declared units",
    "paragraphs": [
      "Environmental Product Declarations report impacts against a declared or functional quantity. A project schedule may use kilograms, tonnes, cubic metres, square metres, linear metres or pieces. Before multiplying quantity by an EPD factor, the project quantity must be converted to the basis used by the dataset.",
      "Straight conversions such as kilograms to tonnes or square feet to square metres can be handled directly. Cross-dimensional conversions need physical information. Converting mass to volume requires density; converting area to volume requires thickness. When the required conversion data is missing, the safer response is to flag the row instead of inventing a density or thickness."
    ]
  },
  {
    "id": "modules",
    "heading": "Lifecycle modules A1-D",
    "paragraphs": [
      "The engine stores lifecycle information by module rather than collapsing the entire building into four generic phases. This keeps the result auditable and makes it possible to distinguish product-stage impacts from transportation, replacement and end-of-life scenarios."
    ],
    "table": {
      "headers": [
        "Module",
        "Typical meaning",
        "Treatment in the engine"
      ],
      "rows": [
        [
          "A1-A3",
          "Raw material supply, transport associated with production, and manufacturing",
          "Uses declared product-stage impacts from the selected dataset."
        ],
        [
          "A4",
          "Transport from production or supply location to the project site",
          "Can be calculated from product mass, transport mode and distance when project-specific data is available."
        ],
        [
          "A5",
          "Construction and installation",
          "Kept separate from manufacturing and transport."
        ],
        [
          "B1-B3",
          "Use, maintenance and repair",
          "Included only when the selected methodology and dataset provide applicable values."
        ],
        [
          "B4",
          "Replacement",
          "Triggered by service-life assumptions during the building study period rather than multiplying the initial A-stage total."
        ],
        [
          "B5-B7",
          "Refurbishment, operational energy and operational water",
          "Tracked separately; operational energy should not be multiplied across every material row."
        ],
        [
          "C1-C4",
          "Deconstruction, transport, waste processing and disposal",
          "Reported as end-of-life impacts when the required scenario or dataset is available."
        ],
        [
          "D",
          "Benefits and loads beyond the system boundary",
          "Shown separately from A-C and never replaced with a generic recycling credit."
        ]
      ]
    }
  },
  {
    "id": "transport",
    "heading": "A4 transport calculations",
    "paragraphs": [
      "A4 represents transportation of construction products to the project site. A practical project-specific calculation needs the mass being moved, the travel distance and the transport mode. Building Transparency describes the same core inputs for EC3 A4 calculations: product weight, transportation mode and transportation distance.",
      "When a project quantity is not expressed by mass, the calculation needs mass per declared unit or another defensible way to determine mass. A transport result should be flagged when mass is unknown rather than assuming that every material unit weighs the same amount."
    ],
    "callout": {
      "title": "Do not confuse A4 with A1-A3",
      "body": "A product EPD's manufacturing GWP and project delivery emissions are different lifecycle contributions. Keeping them separate makes design and procurement decisions easier to explain."
    }
  },
  {
    "id": "replacement",
    "heading": "Replacement and study period logic",
    "paragraphs": [
      "A building study period may be longer than the reference service life of finishes, insulation, membranes or other products. When replacement is required, the replacement event belongs in the use stage, commonly B4. The methodology therefore separates the initial product from later replacement events instead of simply multiplying A1-A5 by a rounded replacement count.",
      "Service-life assumptions can materially change whole-life results. Baseline and proposed comparisons should use consistent study periods, and service lives should be documented so reviewers can reproduce the scenario."
    ]
  },
  {
    "id": "end-of-life",
    "heading": "C1-C4 and Module D are not the same thing",
    "paragraphs": [
      "End-of-life processing still causes impacts even when a material is recyclable. Demolition, transport, sorting, processing and residual disposal should not disappear merely because the recovery percentage reaches 100 percent.",
      "Module D is a separate accounting of potential benefits or loads beyond the assessed system boundary. The engine therefore keeps Module D outside the A-C result and only reports it when the source dataset or an explicitly documented scenario supports it."
    ]
  },
  {
    "id": "comparison",
    "heading": "Baseline and proposed building comparisons",
    "paragraphs": [
      "A meaningful comparison requires more than two uploaded spreadsheets. The models should represent functionally comparable buildings or options, use the same study period and apply consistent software, datasets and boundaries. Large differences in floor area, building function or omitted systems can overwhelm the effect of a material substitution.",
      "For certification-oriented work, use the exact equivalence rules of the applicable rating system. The calculator's comparison interface supports design analysis, but certification decisions remain the responsibility of the project team and reviewing authority."
    ]
  },
  {
    "id": "quality",
    "heading": "Data quality checks before trusting the total",
    "bullets": [
      "Resolve unmapped materials or quantify how much of the project remains unmapped.",
      "Review unit-conversion warnings and verify density or thickness assumptions.",
      "Confirm which lifecycle modules are declared and which are not declared.",
      "Check service-life assumptions for products that may be replaced.",
      "Confirm A4 transport mode and distance when transportation is material to the result.",
      "Keep Module D separate from the A-C result.",
      "Export the same calculation core to the dashboard, CSV and PDF so totals do not diverge."
    ],
    "callout": {
      "title": "ND does not mean zero",
      "body": "If an EPD does not declare a module or indicator, treating the missing result as zero can materially understate impact. The calculation should preserve the absence of data."
    }
  }
];
const faqs = [
  {
    "q": "What is an embodied carbon calculation methodology?",
    "a": "It is the documented set of rules used to convert material quantities and environmental datasets into lifecycle results. A good methodology states the system boundary, units, study period, data sources, transport and replacement assumptions, end-of-life treatment, and how missing data is handled."
  },
  {
    "q": "Why does the calculator refuse to guess a value for an unknown material?",
    "a": "A default number can make an incomplete model look precise. The tool flags unknown materials so the user can map them to a defensible dataset or explicitly document a proxy."
  },
  {
    "q": "Is Module D subtracted from the whole-building A-C result?",
    "a": "No. Module D represents benefits or loads beyond the system boundary and should be reported separately unless a particular reporting framework explicitly instructs otherwise."
  },
  {
    "q": "Can the same methodology be used for every certification system?",
    "a": "No. The calculation core can support multiple frameworks, but each rating system may define different scope, equivalence, impact categories, service periods or reporting rules."
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
    "href": "/whole-building-lca",
    "title": "Whole-building LCA guide",
    "description": "Understand scope, service life, baseline comparison and whole-life reporting."
  },
  {
    "href": "/module-d-lca",
    "title": "Module D explained",
    "description": "Understand recycling and reuse benefits beyond the system boundary without double counting."
  }
];
const sources = [
  {
    "href": "https://docs.buildingtransparency.org/",
    "label": "Building Transparency documentation — EC3 and tallyLCA scope"
  },
  {
    "href": "https://docs.buildingtransparency.org/ec3/main-features/plan-and-compare-buildings/a4-transportation-emissions",
    "label": "Building Transparency — A4 transportation emissions"
  },
  {
    "href": "https://www.usgbc.org/node/2755842",
    "label": "USGBC — LEED v4 Building Life-Cycle Impact Reduction guide"
  }
];

export default function Page() {
  return (
    <SeoGuideLayout
      eyebrow="Calculation methodology"
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
