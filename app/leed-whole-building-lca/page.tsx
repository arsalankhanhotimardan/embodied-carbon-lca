import type { Metadata } from "next";
import SeoGuideLayout from "@/components/SeoGuideLayout";

const title = "LEED Whole-Building LCA: v4, v4.1 & v5";
const description = "Understand LEED whole-building LCA requirements across v4, v4.1 and v5, including baseline comparison, GWP reductions, impact categories and study scope.";
const path = "/leed-whole-building-lca";

export const metadata: Metadata = {
  title: "LEED Whole-Building LCA: v4, v4.1 & v5",
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
    "id": "versions",
    "heading": "LEED whole-building LCA depends on the rating-system version",
    "paragraphs": [
      "The phrase 'LEED whole-building LCA' does not describe one timeless threshold. LEED v4, v4.1 and v5 use related but different pathways and reduction levels. A software interface should therefore identify which version is being checked rather than presenting one percentage test as universal LEED certification.",
      "The current calculator includes an indicative LEED v4-style comparison. It should be treated as design support until the project team verifies the applicable LEED version, scope, functional equivalence, impact method and documentation requirements."
    ]
  },
  {
    "id": "v4",
    "heading": "LEED v4 Building Life-Cycle Impact Reduction",
    "paragraphs": [
      "USGBC's LEED v4 guidance for the whole-building LCA option requires the proposed building to demonstrate at least a 10% reduction in global warming potential and at least a 10% reduction in two additional impact measures compared with a baseline, while no assessed measure may increase by more than 5%. The assessment is cradle to grave for the defined structure and enclosure scope over the assumed service life.",
      "That means a calculator needs more than GWP if it is being used for the comparative credit. It must preserve the other required impact categories and apply the same software tools and datasets to the baseline and proposed cases."
    ]
  },
  {
    "id": "v41",
    "heading": "LEED v4.1 adds multiple WBLCA achievement paths",
    "paragraphs": [
      "LEED v4.1 BD+C provides multiple pathways. Published USGBC guidance includes a path for conducting the assessment and higher point levels for reductions such as 5%, 10% and, with additional reuse or salvage requirements, 20% GWP reduction together with reductions in other impact categories. No assessed impact category may increase by more than 5% for the comparative reduction paths.",
      "USGBC also requires the baseline and proposed buildings to be comparable in size, function, orientation and operating energy performance, and to use the same service life, at least 60 years, for the cited v4.1 paths."
    ]
  },
  {
    "id": "v5",
    "heading": "LEED v5 changes the embodied-carbon framework",
    "paragraphs": [
      "LEED v5 BD+C, in the February 2026 rating system, uses a cradle-to-grave whole-building LCA covering modules A-C while excluding operating energy and operating-water-related energy from the WBLCA result. It includes GWP plus ozone depletion, acidification, eutrophication and tropospheric ozone formation in the WBLCA report.",
      "For new construction, the v5 whole-building LCA option awards increasing points as GWP reductions reach higher thresholds. The published table includes 10%, 20%, 30%, 40% and 50% or greater reduction levels, making version-aware compliance logic important for any current LCA SaaS."
    ]
  },
  {
    "id": "equivalence",
    "heading": "Functional equivalence is essential to a LEED comparison",
    "paragraphs": [
      "A baseline should not be made artificially carbon-heavy by changing floor area, function or performance assumptions. The point of the comparison is to isolate design improvements. Keep the study period, scope, datasets and calculation method consistent, then document the design changes that explain the reduction.",
      "The software can help by storing gross floor area, building use, study period and system boundary alongside the BOM. A warning should appear when baseline and proposed project metadata are materially different."
    ]
  },
  {
    "id": "software",
    "heading": "How the calculator should support LEED without overclaiming",
    "bullets": [
      "Label every compliance check with the specific LEED version and path.",
      "Show the underlying impact-category reductions, not only a green 'pass' badge.",
      "Keep missing impact categories visible instead of estimating them from GWP.",
      "Report baseline and proposed quantities and lifecycle boundaries.",
      "Include a methodology narrative and data-quality section in the export.",
      "Use language such as 'indicative check' until the workflow has been independently validated for formal submission."
    ],
    "callout": {
      "title": "Software does not certify a LEED credit",
      "body": "A calculator can implement the published comparison logic, but the project team's documentation and the certification review determine whether the credit is achieved."
    }
  }
];
const faqs = [
  {
    "q": "What is the LEED v4 WBLCA reduction requirement?",
    "a": "USGBC's v4 guidance requires at least 10% GWP reduction plus 10% reduction in two additional impact measures, with no assessed measure increasing by more than 5%."
  },
  {
    "q": "Does LEED v4.1 use the same threshold as v4?",
    "a": "No. v4.1 provides multiple paths and point levels, including 5% and 10% reduction paths and a higher 20% GWP path with additional conditions."
  },
  {
    "q": "What changed in LEED v5 whole-building LCA?",
    "a": "The February 2026 BD+C rating system uses a cradle-to-grave A-C WBLCA excluding operating energy and operating-water-related energy, and awards more points at progressively higher GWP reductions."
  },
  {
    "q": "Can this calculator guarantee LEED certification?",
    "a": "No. It can support calculations and comparison logic, but formal achievement depends on the applicable rating-system rules, complete project documentation and certification review."
  }
];
const related = [
  {
    "href": "/whole-building-lca",
    "title": "Whole-building LCA guide",
    "description": "Understand scope, service life, baseline comparison and whole-life reporting."
  },
  {
    "href": "/methodology",
    "title": "LCA calculation methodology",
    "description": "See how quantities, units, lifecycle modules, replacements and missing data are handled."
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
    "href": "https://www.usgbc.org/node/2755842",
    "label": "USGBC — LEED v4 Building Life-Cycle Impact Reduction guide"
  },
  {
    "href": "https://www.usgbc.org/sites/default/files/2021-03/LEED%20v4.1%20BD%2BC%20Guide%2004092019.pdf",
    "label": "USGBC — LEED v4.1 BD+C guide"
  },
  {
    "href": "https://www.usgbc.org/sites/default/files/2026-03/LEED%20v5%20BD%2BC%20Rating%20System_February%202026.pdf",
    "label": "USGBC — LEED v5 BD+C rating system, February 2026"
  }
];

export default function Page() {
  return (
    <SeoGuideLayout
      eyebrow="LEED WBLCA guide"
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
