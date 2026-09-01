import type { Metadata } from "next";
import SeoGuideLayout from "@/components/SeoGuideLayout";

const title = "EC3 EPD Guide: Search, Match & Use Material Data";
const description = "Learn how to search EC3 EPD data, fix BIM material names, review declared units and connect product-level embodied carbon data to a whole-building LCA workflow.";
const path = "/ec3-epd-guide";

export const metadata: Metadata = {
  title: "EC3 EPD Guide: Search, Match & Use Material Data",
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
    "heading": "What EC3 is and where it fits in an LCA workflow",
    "paragraphs": [
      "EC3, the Embodied Carbon in Construction Calculator from Building Transparency, is a free construction-specific material search and planning tool backed by a large database of digital third-party EPDs. Building Transparency describes EC3 as a tool for finding and comparing materials, planning embodied-carbon reductions and supporting procurement.",
      "EC3 and whole-building LCA are related but not identical. Building Transparency's own documentation distinguishes upfront carbon assessment from whole-life impact assessment. A whole-building LCA may include future replacement, use-stage and end-of-life effects in addition to product-stage carbon."
    ]
  },
  {
    "id": "search",
    "heading": "How to search EC3 when the BIM name is wrong or too specific",
    "paragraphs": [
      "A model name such as 'Concrete (Cast-in-Place) - 4000psi - Level 2' may not match the wording used by an EPD record. Instead of forcing users to edit the source schedule, the calculator gives the EC3 search term its own editable field.",
      "Start with the most meaningful product description, then simplify if results are poor. Remove level names, internal family codes and irrelevant punctuation. Keep performance information such as concrete strength or steel grade when it helps distinguish functionally different products."
    ],
    "numbered": [
      "Keep the original BIM/CSV alias unchanged.",
      "Search using the original name first.",
      "If results are poor, edit only the EC3 search term.",
      "Select the EPD that best matches product type, specification, geography and declared unit.",
      "Preserve the approved alias-to-EPD mapping for future imports only when your EC3 access terms allow storage."
    ]
  },
  {
    "id": "fields",
    "heading": "What to review before selecting an EC3 EPD",
    "bullets": [
      "Product name and manufacturer.",
      "Product category and performance attributes.",
      "Declared quantity and unit.",
      "A1-A3 GWP and any other declared lifecycle modules.",
      "Plant or geographic relevance where available.",
      "EPD validity and program information.",
      "Whether the candidate represents a product-specific EPD, industry average or another data type."
    ]
  },
  {
    "id": "integration",
    "heading": "How the Green Engineering Tools EC3 reconciliation works",
    "paragraphs": [
      "The frontend first checks its local and shared material mappings. If the material is unresolved, the user can search the EC3-connected backend. The selected result is normalized into the LCA data structure while missing modules remain missing.",
      "When the returned result contains a usable openEPD identifier, the backend can request the detailed digital EPD record before calculation. This prevents the application from reducing an EPD to only a name and one GWP number when richer data is available."
    ]
  },
  {
    "id": "permissions",
    "heading": "API access and data-storage permissions matter",
    "paragraphs": [
      "An API connection does not automatically grant unlimited rights to cache or redistribute the provider's data. Production SaaS applications should follow the current Building Transparency API terms and the permissions attached to their access level.",
      "For that reason, the backend uses an explicit EC3 persistence flag. The calculator can use a selected record for the current analysis while persistent shared storage remains disabled until the application's EC3 agreement permits caching or reuse."
    ],
    "callout": {
      "title": "Technical capability and data rights are separate questions",
      "body": "A database can technically store an EPD response, but a production SaaS should only enable that behavior when its data-access agreement permits it."
    }
  },
  {
    "id": "ec3-vs-lca",
    "heading": "EC3 material comparison versus whole-building LCA",
    "paragraphs": [
      "EC3 is particularly strong for material specification and procurement because EPD data can reveal differences between products that meet similar performance needs. A whole-building LCA adds a system-level view: how much material is used, how long products last, what is replaced, what happens at end of life and how design alternatives compare.",
      "Using EC3 as a material-data workflow inside a broader LCA engine can connect procurement detail to the building-level decision without pretending that an EPD search alone is a complete whole-life assessment."
    ]
  }
];
const faqs = [
  {
    "q": "Is EC3 a free embodied carbon database?",
    "a": "Building Transparency describes EC3 as a free, open-access construction embodied-carbon tool with a large digital EPD database. API integration and production data rights can have separate terms."
  },
  {
    "q": "Why can't I find my exact Revit material name in EC3?",
    "a": "BIM names often contain internal naming conventions that do not match EPD product names. Simplify or correct the search term while preserving the original model alias."
  },
  {
    "q": "Does selecting an EC3 EPD automatically make the whole-building LCA correct?",
    "a": "No. The EPD still has to match the material and declared unit, and the project must define quantities, lifecycle scope, transport, service life and other assumptions."
  },
  {
    "q": "Can the SaaS remember an approved EC3 match for the next user?",
    "a": "Technically yes through a shared alias mapping, but persistent EC3 storage should only be enabled when your Building Transparency access agreement permits caching or reuse."
  }
];
const related = [
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
  },
  {
    "href": "https://docs.buildingtransparency.org/ec3/main-features/find-and-compare-materials",
    "label": "Building Transparency — Find & Compare Materials"
  }
];

export default function Page() {
  return (
    <SeoGuideLayout
      eyebrow="EC3 material and EPD workflow"
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
