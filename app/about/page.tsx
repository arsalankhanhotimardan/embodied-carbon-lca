import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Green Engineering Tools | Engineering Calculators",
  description:
    "Learn how Green Engineering Tools builds practical calculators for embodied carbon, building performance, electrical design, solar planning and CBAM analysis.",
  alternates: { canonical: "https://greenengineeringtools.com/about" },
  openGraph: {
    title: "About Green Engineering Tools",
    description:
      "A transparent, practical engineering-tools platform for calculations, planning and learning.",
    url: "https://greenengineeringtools.com/about",
    type: "website",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Green Engineering Tools",
  url: "https://greenengineeringtools.com/about",
  description:
    "Information about Green Engineering Tools, its purpose, approach and engineering calculator platform.",
  mainEntity: {
    "@type": "Organization",
    name: "Green Engineering Tools",
    url: "https://greenengineeringtools.com",
    founder: {
      "@type": "Person",
      name: "Engr. Arsalan Khan",
    },
  },
};

const toolGroups = [
  {
    title: "Carbon and sustainability",
    text: "Use embodied-carbon, LCA, EPD and CBAM tools to organize environmental inputs, compare scenarios and understand the assumptions behind a result.",
    links: [
      { label: "Embodied Carbon & LCA Calculator", href: "/" },
      { label: "CBAM Calculator", href: "/cbam-calculator" },
      { label: "Methodology and assumptions", href: "/methodology" },
    ],
  },
  {
    title: "Building performance",
    text: "Building-envelope tools help users explore insulation, R-value, U-value, heat loss and carbon-payback questions before detailed design work.",
    links: [
      { label: "Building-envelope tools", href: "/building-envelope" },
      { label: "Engineering guides", href: "/guides" },
    ],
  },
  {
    title: "Electrical planning",
    text: "Electrical utilities support early-stage current, voltage-drop, conductor and three-phase calculations. Results are planning estimates, not a replacement for code review.",
    links: [{ label: "Electrical tools", href: "/electrical" }],
  },
  {
    title: "Solar planning",
    text: "The related solar service provides a focused space for solar-load and energy-planning calculations.",
    links: [
      {
        label: "Open the solar engineering tools",
        href: "https://solar.greenengineeringtools.com",
      },
    ],
  },
];

const principles = [
  {
    title: "Explain the result",
    text: "A useful number needs context. Our pages aim to show the equation, units, input assumptions, limits and the next design question a user should consider.",
  },
  {
    title: "Keep inputs visible",
    text: "Users should be able to see what they entered, change important assumptions and understand whether a value came from a reference source or from their own data.",
  },
  {
    title: "Build for practical work",
    text: "The tools are designed for engineers, architects, sustainability teams, students and project stakeholders who need a useful first estimate without unnecessary account barriers.",
  },
  {
    title: "Be clear about limits",
    text: "Engineering calculations can depend on local codes, site conditions, product evidence and professional judgment. We identify those boundaries instead of presenting every result as a final design decision.",
  },
];

export default function AboutUs() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
            About Green Engineering Tools
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
            Practical engineering calculations with transparent assumptions.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
            Green Engineering Tools is an independent web-based platform for
            engineering, energy and sustainability calculations. Its purpose is
            to make useful early-stage analysis easier to access while keeping
            the inputs, equations, sources and limitations understandable.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-emerald-800">
              No account required for core tools
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-slate-700">
              Built for worldwide use
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-slate-700">
              Planning and learning support
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_.8fr] lg:py-20">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">
            Why the platform exists
          </h2>
          <div className="mt-5 space-y-5 text-base leading-8 text-slate-600">
            <p>
              Engineering work often begins with a question that is too specific
              for a general search result but too early for a full consultancy
              model: how much current will a load draw, how will insulation
              change heat loss, what is the carbon impact of a material, or what
              inputs are needed for a CBAM estimate?
            </p>
            <p>
              Green Engineering Tools turns those questions into focused web
              utilities. The platform is led and developed by Engr. Arsalan
              Khan, with an emphasis on practical interfaces, explainable
              calculations and responsible use of reference data.
            </p>
            <p>
              The tools are intended to help people prepare an estimate, compare
              options, identify missing information and communicate a technical
              issue more clearly. They are not presented as official government
              systems, accredited verification services or final engineering
              approvals.
            </p>
          </div>
        </div>

        <aside className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Our promise to users
          </p>
          <h2 className="mt-3 text-2xl font-black text-emerald-950">
            Useful first estimates, clearly labelled.
          </h2>
          <ul className="mt-5 space-y-4 text-sm leading-7 text-emerald-950">
            <li>
              <strong>Inputs first:</strong> important assumptions should be
              visible and editable.
            </li>
            <li>
              <strong>Sources matter:</strong> official or external reference
              data should not be presented as personal measurement.
            </li>
            <li>
              <strong>Uncertainty is useful:</strong> a warning about missing
              evidence is better than false precision.
            </li>
            <li>
              <strong>Human review remains important:</strong> design codes,
              project conditions and professional judgment still apply.
            </li>
          </ul>
        </aside>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Explore the platform
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              Tools for connected engineering decisions
            </h2>
            <p className="mt-4 leading-8 text-slate-600">
              A calculation is more useful when it connects to the next step.
              Use the focused tools below, then read the related methodology or
              guide before relying on a result for a project decision.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {toolGroups.map((group) => (
              <article
                key={group.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
              >
                <h3 className="text-xl font-black text-slate-950">
                  {group.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {group.text}
                </p>
                <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm font-bold">
                  {group.links.map((link) =>
                    link.href.startsWith("http") ? (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:underline"
                      >
                        {link.label} →
                      </a>
                    ) : (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-emerald-700 hover:underline"
                      >
                        {link.label} →
                      </Link>
                    )
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
            How we work
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            Principles behind each calculator
          </h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((principle, index) => (
            <article
              key={principle.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-800">
                {index + 1}
              </div>
              <h3 className="mt-5 text-lg font-black text-slate-950">
                {principle.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {principle.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:py-16">
          <div>
            <h2 className="text-2xl font-black sm:text-3xl">
              Need help understanding a result?
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-300">
              Tell us which tool you used, what inputs you entered and what you
              expected to see. Please remove private project information,
              passwords and API keys before sharing screenshots or files.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex w-fit rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950 hover:bg-emerald-400"
          >
            Contact the team →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-950">
          <strong>Important:</strong> Green Engineering Tools is an independent
          planning and education platform. Its calculators do not replace local
          electrical or building codes, manufacturer instructions, accredited
          verification, customs advice, legal advice or a qualified engineer’s
          review.
        </div>
      </section>
    </main>
  );
}
