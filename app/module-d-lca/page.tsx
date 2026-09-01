import type { Metadata } from "next";
import SeoGuideLayout from "@/components/SeoGuideLayout";

const title = "Module D LCA Explained: Recycling & Reuse";
const description = "Understand Module D in EN 15804-style building LCA: recycling and reuse beyond the system boundary, C1-C4 separation, EPD data and reporting.";
const path = "/module-d-lca";

export const metadata: Metadata = {
  title: "Module D LCA Explained: Recycling & Reuse",
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
    "heading": "What Module D means in building LCA",
    "paragraphs": [
      "Module D reports potential benefits or loads beyond the assessed product or building system boundary. It can reflect scenarios such as reuse, recycling or energy recovery that may displace future production outside the A-C lifecycle of the assessed building.",
      "Because Module D occurs beyond the system boundary, it is not simply a negative end-of-life number. A product can have C-stage impacts for demolition, transport and processing while also reporting a separate Module D benefit or load."
    ]
  },
  {
    "id": "not-credit",
    "heading": "Why a recycling percentage is not a Module D formula",
    "paragraphs": [
      "A generic formula such as manufacturing GWP × recycling rate × 85% assumes that recovered material perfectly substitutes for virgin material according to an arbitrary efficiency. Real Module D results depend on the product system, recovery process, material quality, substitution assumptions and the methodology used by the declaration.",
      "The safer software rule is simple: use declared Module D data or a documented scenario methodology. If neither exists, display Module D as unavailable rather than manufacturing a credit."
    ],
    "callout": {
      "title": "100% recyclable does not mean zero C-stage emissions",
      "body": "Recycling still involves deconstruction, sorting, transport and processing. Keep C1-C4 and Module D as separate lifecycle contributions."
    }
  },
  {
    "id": "example",
    "heading": "Conceptual example: steel recovery at end of life",
    "paragraphs": [
      "Imagine a structural steel product with declared C-stage impacts and a separate Module D result. The building total through end of life includes the applicable A, B and C modules. Module D is then reported on another line as the declared beyond-boundary potential.",
      "This presentation lets reviewers see both the burden of end-of-life processing and the potential benefit of recovered material without cancelling one against the other invisibly."
    ]
  },
  {
    "id": "epd",
    "heading": "How to read Module D in an EPD",
    "bullets": [
      "Confirm that Module D is actually declared for the product.",
      "Check the indicator unit and declared quantity.",
      "Review the scenario or assumptions described by the EPD.",
      "Do not compare Module D across products as if every declaration uses identical recovery conditions.",
      "Keep the EPD's Module D value traceable to the source record."
    ]
  },
  {
    "id": "reporting",
    "heading": "How this calculator reports Module D",
    "paragraphs": [
      "The engine stores Module D separately from A1-C4. It does not automatically subtract Module D from lifecycle GWP. CSV and PDF exports should consume the same calculation core so the beyond-boundary result is reported consistently.",
      "If a selected dataset lacks Module D, the interface should show the absence of data. This is more defensible than assigning a default reuse or recycling saving."
    ]
  }
];
const faqs = [
  {
    "q": "Is Module D always a carbon saving?",
    "a": "No. Module D can be a benefit or a load depending on the scenario and dataset."
  },
  {
    "q": "Can I calculate Module D from recycling percentage alone?",
    "a": "Not reliably. Recovery percentage is only one part of a substitution or recovery scenario. Use declared data or a documented methodology."
  },
  {
    "q": "Does Module D replace C1-C4?",
    "a": "No. C1-C4 represent end-of-life activities within the system boundary; Module D reports potential effects beyond that boundary."
  },
  {
    "q": "Should Module D be subtracted from A-C in the dashboard?",
    "a": "The calculator reports it separately to avoid obscuring the system boundary. A reporting framework can then specify how it should be presented."
  }
];
const related = [
  {
    "href": "/whole-building-lca",
    "title": "Whole-building LCA guide",
    "description": "Understand scope, service life, baseline comparison and whole-life reporting."
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
  },
  {
    "href": "/leed-whole-building-lca",
    "title": "LEED whole-building LCA",
    "description": "Review LEED v4, v4.1 and v5 WBLCA concepts and comparison requirements."
  }
];
const sources = [
  {
    "href": "https://docs.buildingtransparency.org/",
    "label": "Building Transparency documentation — EC3 and tallyLCA scope"
  }
];

export default function Page() {
  return (
    <SeoGuideLayout
      eyebrow="Module D and circularity"
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
