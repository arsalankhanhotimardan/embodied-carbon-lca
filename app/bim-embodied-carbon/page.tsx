import type { Metadata } from "next";
import SeoGuideLayout from "@/components/SeoGuideLayout";

const title = "BIM Embodied Carbon Calculator: Revit to LCA";
const description = "Use BIM or Revit quantities for embodied carbon analysis. Learn CSV schedules, material mapping, EPD units, live synchronization and model quality checks.";
const path = "/bim-embodied-carbon";

export const metadata: Metadata = {
  title: "BIM Embodied Carbon Calculator: Revit to LCA",
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
    "id": "why",
    "heading": "Why BIM is valuable for embodied carbon calculations",
    "paragraphs": [
      "Building Information Modeling contains the geometry and object information needed to produce material quantities at a scale that would be painful to enter manually. A BIM embodied-carbon workflow can extract quantities, preserve element identity and update calculations as the design changes.",
      "The difficult part is not exporting a spreadsheet; it is translating BIM naming and geometry into LCA quantities that match environmental datasets. A robust workflow therefore separates quantity extraction, material resolution, unit normalization and lifecycle calculation."
    ]
  },
  {
    "id": "schedule",
    "heading": "Minimum fields for a useful BIM material schedule",
    "table": {
      "headers": [
        "Field",
        "Why keep it",
        "Example"
      ],
      "rows": [
        [
          "Element ID",
          "Lets updates be traced to a stable model object",
          "382821"
        ],
        [
          "Category",
          "Provides BIM context for the material",
          "Structural Framing"
        ],
        [
          "Family / type",
          "Helps distinguish assemblies and specifications",
          "W310x60"
        ],
        [
          "Material name",
          "Primary key for material resolution",
          "Structural Steel"
        ],
        [
          "Quantity",
          "Amount being assessed",
          "1200"
        ],
        [
          "Unit",
          "Required for EPD normalization",
          "kg"
        ],
        [
          "Level / phase",
          "Useful for filtering and QA",
          "Level 02 / New Construction"
        ],
        [
          "Project or model ID",
          "Keeps sync events tied to the correct workspace",
          "tower-001"
        ]
      ]
    }
  },
  {
    "id": "csv",
    "heading": "CSV workflow for Revit and other BIM tools",
    "paragraphs": [
      "CSV is a practical interchange format because most BIM and estimating tools can export schedules. In the calculator, the user maps the material, quantity and unit columns instead of being forced into one rigid export template.",
      "Once imported, known aliases are resolved automatically. Unknown names open the reconciliation workflow. The user can edit the EC3 search term without changing the original BIM material, which preserves traceability and makes future mapping easier."
    ]
  },
  {
    "id": "live",
    "heading": "Moving from CSV export to live Revit synchronization",
    "paragraphs": [
      "A live connector should send stable element IDs and only the information needed for the calculation. The backend webhook can store a sync event with project ID, model ID, element count, checksum and payload.",
      "The next optimization is incremental synchronization: identify which elements were added, changed or deleted instead of retransmitting and recalculating an entire model after every small design edit. That reduces network traffic and calculation time on large projects."
    ]
  },
  {
    "id": "quality",
    "heading": "BIM quantity checks before calculating carbon",
    "bullets": [
      "Remove duplicate quantities caused by linked models or overlapping schedules.",
      "Check whether modeled thickness and volume correspond to the quantity basis expected by the EPD.",
      "Separate temporary construction objects from permanent building scope when appropriate.",
      "Resolve compound assemblies carefully so components are not double counted.",
      "Review material names that are actually finishes, paint parameters or placeholders rather than physical materials.",
      "Track which percentage of the project has a valid environmental dataset."
    ]
  },
  {
    "id": "speed",
    "heading": "How to keep BIM carbon calculations fast",
    "paragraphs": [
      "Large models can contain tens of thousands of material rows. The calculation engine should use indexed material maps rather than repeatedly searching arrays, paginate or virtualize long tables, and reuse a single calculation core for dashboard and exports.",
      "For a SaaS platform, the database can store approved material aliases centrally while project-specific BIM quantities remain scoped to the user's organization and project. That combination reduces repeated mapping work without exposing one client's project data to another."
    ]
  }
];
const faqs = [
  {
    "q": "Can I calculate embodied carbon from Revit?",
    "a": "Yes. A Revit schedule can be exported to CSV for immediate use, or a custom add-in can send model quantities to a secured backend webhook."
  },
  {
    "q": "What BIM data is required for an LCA?",
    "a": "At minimum, you need a material identifier, quantity and unit. Stable element IDs, categories, types and project identifiers improve traceability and live synchronization."
  },
  {
    "q": "Why does my Revit material name fail to match an EPD?",
    "a": "Revit names are often project-specific. Keep the original name, then search using a simpler product description and approve the mapping when a suitable dataset is found."
  },
  {
    "q": "Is live BIM sync automatically better than CSV?",
    "a": "It is faster for frequent design updates, but only when the quantity extraction and material mapping are reliable. CSV can be easier to audit during early implementation."
  }
];
const related = [
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
    "href": "/epd-carbon-calculator",
    "title": "EPD carbon calculator",
    "description": "Learn how to read EPD units, GWP values, declared modules and data limitations."
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
      eyebrow="BIM and Revit carbon workflow"
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
