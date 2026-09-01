import type { Metadata } from "next";
import SeoGuideLayout from "@/components/SeoGuideLayout";

const title = "Whole-Building LCA Calculator Guide";
const description = "Understand whole-building life-cycle assessment: scope, study period, lifecycle modules, baseline comparison, impact categories and kg CO₂e/m² reporting.";
const path = "/whole-building-lca";

export const metadata: Metadata = {
  title: "Whole-Building LCA Calculator Guide",
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
    "heading": "What whole-building life-cycle assessment means",
    "paragraphs": [
      "Whole-building life-cycle assessment evaluates environmental impacts across a defined building scope and study period rather than looking at one product in isolation. It combines quantities, material datasets and lifecycle scenarios to understand how design decisions affect the building as a system.",
      "Building Transparency distinguishes upfront carbon assessment from whole-life assessment: upfront tools focus on stages measurable at the beginning of a project, while whole-life assessment also anticipates future use-stage and end-of-life effects. Complete LCA can also include impact categories beyond GWP, such as acidification and eutrophication."
    ]
  },
  {
    "id": "scope",
    "heading": "Define the building scope before calculating",
    "paragraphs": [
      "The most important question is not 'what is the total?' but 'total of what?' A study may cover structure and enclosure, or a broader set of interiors and hardscape. Certification programs can prescribe specific scope. Internal design studies can choose another scope, but the boundary should be explicit.",
      "A transparent report states gross floor area, study period, included building systems, excluded systems, data source hierarchy and lifecycle modules. This makes it possible to interpret kg CO₂e/m² and compare options fairly."
    ]
  },
  {
    "id": "stages",
    "heading": "From A1-A3 to C1-C4",
    "paragraphs": [
      "A whole-building model typically starts with product-stage manufacturing, then adds project transport and construction, replacement during the study period, and end-of-life stages. Operational energy can be analyzed as a separate project-level trajectory when useful, but reporting frameworks may define whether it belongs in the WBLCA result.",
      "Module D is beyond the product life-cycle boundary and should remain a separate line rather than silently reducing the A-C result."
    ]
  },
  {
    "id": "comparison",
    "heading": "Baseline versus proposed design",
    "paragraphs": [
      "Comparative WBLCA is powerful because it answers a design question rather than only producing an absolute number. The baseline and proposed models should use consistent software, datasets, service period and system boundary. Functional differences should be controlled so the result reflects design decisions instead of unrelated scope changes.",
      "A line-by-line delta can show which substitutions create the largest savings or increases. This is often more actionable than a single percentage at the top of a report."
    ]
  },
  {
    "id": "impacts",
    "heading": "Carbon is important, but LCA can report more than GWP",
    "paragraphs": [
      "GWP in kg CO₂e is the most familiar indicator and is central to embodied-carbon targets. Whole-building LCA can also report acidification, eutrophication, ozone depletion, smog or other indicators depending on the method and reporting framework.",
      "Environmental indicators are not interchangeable. If an EPD or database does not provide a particular category, the tool should not estimate it by multiplying GWP by an arbitrary percentage."
    ]
  },
  {
    "id": "report",
    "heading": "What a useful WBLCA report should contain",
    "bullets": [
      "Project description, gross floor area and study period.",
      "System boundary and included building systems.",
      "Data sources and version or EPD identifiers.",
      "Declared-unit and quantity-conversion methodology.",
      "Results by lifecycle module and impact category.",
      "Baseline and proposed differences where comparison is performed.",
      "Module D reported separately.",
      "Missing-data and proxy-material disclosure.",
      "A narrative explaining the design changes that drive the result."
    ]
  }
];
const faqs = [
  {
    "q": "What is a whole-building LCA calculator?",
    "a": "It combines material quantities, lifecycle datasets and project assumptions across a building scope to report environmental impacts over a defined study period."
  },
  {
    "q": "Is whole-building LCA the same as embodied carbon?",
    "a": "Embodied carbon focuses on GWP associated with materials and construction processes. Whole-building LCA can include multiple environmental impact categories and a broader lifecycle scope."
  },
  {
    "q": "Why normalize WBLCA by floor area?",
    "a": "kg CO₂e/m² helps compare projects of different size, but only when the system boundary and assumptions are comparable."
  },
  {
    "q": "Should Module D be included in the building total?",
    "a": "It should generally be shown separately from A-C because it represents benefits or loads beyond the assessed system boundary."
  }
];
const related = [
  {
    "href": "/methodology",
    "title": "LCA calculation methodology",
    "description": "See how quantities, units, lifecycle modules, replacements and missing data are handled."
  },
  {
    "href": "/leed-whole-building-lca",
    "title": "LEED whole-building LCA",
    "description": "Review LEED v4, v4.1 and v5 WBLCA concepts and comparison requirements."
  },
  {
    "href": "/module-d-lca",
    "title": "Module D explained",
    "description": "Understand recycling and reuse benefits beyond the system boundary without double counting."
  },
  {
    "href": "/embodied-carbon-calculator",
    "title": "Embodied carbon calculator guide",
    "description": "Learn how to turn a construction material schedule into an auditable carbon result."
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
  },
  {
    "href": "https://www.usgbc.org/node/2755842",
    "label": "USGBC — LEED v4 Building Life-Cycle Impact Reduction guide"
  }
];

export default function Page() {
  return (
    <SeoGuideLayout
      eyebrow="Whole-building life-cycle assessment"
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
