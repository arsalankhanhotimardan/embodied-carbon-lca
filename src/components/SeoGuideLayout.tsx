import Link from "next/link";
import type { ReactNode } from "react";

type TableData = {
  headers: string[];
  rows: string[][];
};

type GuideSection = {
  id: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  numbered?: string[];
  table?: TableData;
  callout?: {
    title: string;
    body: string;
  };
};

type RelatedGuide = {
  href: string;
  title: string;
  description: string;
};

type SourceLink = {
  href: string;
  label: string;
};

type GuidePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  path: string;
  updated: string;
  sections: GuideSection[];
  faqs: { q: string; a: string }[];
  related: RelatedGuide[];
  sources?: SourceLink[];
  children?: ReactNode;
};

const SITE_URL = "https://greenengineeringtools.com";

export default function SeoGuideLayout({
  eyebrow,
  title,
  description,
  path,
  updated,
  sections,
  faqs,
  related,
  sources = [],
  children,
}: GuidePageProps) {
  const canonical = `${SITE_URL}${path}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    dateModified: updated,
    mainEntityOfPage: canonical,
    publisher: {
      "@type": "Organization",
      name: "Green Engineering Tools",
      url: SITE_URL,
    },
    about: [
      "Life cycle assessment",
      "Embodied carbon",
      "Environmental Product Declarations",
      "Building materials",
    ],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Guides",
        item: `${SITE_URL}/guides`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: canonical,
      },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <section className="bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <nav className="text-sm text-slate-400 mb-7" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/guides" className="hover:text-white">Guides</Link>
          </nav>

          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
            {eyebrow}
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight">
            {title}
          </h1>
          <p className="mt-6 max-w-4xl text-lg sm:text-xl leading-8 text-slate-300">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/#calculator-workspace"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-3 text-sm font-black text-white hover:bg-emerald-400"
            >
              Open the LCA calculator
            </Link>
            <Link
              href="/methodology"
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
            >
              Read methodology
            </Link>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Last reviewed: {updated}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid lg:grid-cols-[minmax(0,1fr)_280px] gap-10">
        <article className="min-w-0">
          {children}

          <div className="space-y-14">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
                  {section.heading}
                </h2>

                {section.paragraphs?.map((paragraph, index) => (
                  <p
                    key={index}
                    className="mt-4 text-[1.02rem] leading-8 text-slate-700"
                  >
                    {paragraph}
                  </p>
                ))}

                {section.bullets && (
                  <ul className="mt-5 space-y-3 list-disc pl-6 text-slate-700 leading-7">
                    {section.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}

                {section.numbered && (
                  <ol className="mt-5 space-y-3 list-decimal pl-6 text-slate-700 leading-7">
                    {section.numbered.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                )}

                {section.table && (
                  <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="bg-slate-900 text-white">
                        <tr>
                          {section.table.headers.map((header) => (
                            <th key={header} className="p-3 text-left font-black">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {section.table.rows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="align-top">
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="p-3 leading-6 text-slate-700">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {section.callout && (
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
                    <h3 className="font-black text-amber-950">{section.callout.title}</h3>
                    <p className="mt-2 leading-7 text-amber-900">{section.callout.body}</p>
                  </div>
                )}
              </section>
            ))}
          </div>

          <section className="mt-16 border-t border-slate-200 pt-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950">
              Frequently asked questions
            </h2>
            <div className="mt-6 space-y-3">
              {faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-xl border border-slate-200 bg-white"
                >
                  <summary className="cursor-pointer list-none p-5 font-black text-slate-900 flex gap-4 justify-between">
                    <span>{faq.q}</span>
                    <span className="text-emerald-600 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className="px-5 pb-5 text-slate-700 leading-7">{faq.a}</div>
                </details>
              ))}
            </div>
          </section>

          {sources.length > 0 && (
            <section className="mt-14 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-black text-slate-950">Authoritative references</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                These links are provided for readers who want to verify standards, product data
                terminology, or certification requirements at the source.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {sources.map((source) => (
                  <li key={source.href}>
                    <a
                      href={source.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-blue-700 hover:underline"
                    >
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-14">
            <h2 className="text-2xl font-black text-slate-950">Continue learning</h2>
            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              {related.map((guide) => (
                <Link
                  key={guide.href}
                  href={guide.href}
                  className="rounded-xl border border-slate-200 bg-white p-5 hover:border-emerald-300 hover:shadow-sm transition"
                >
                  <h3 className="font-black text-slate-950">{guide.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{guide.description}</p>
                </Link>
              ))}
            </div>
          </section>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">
              On this page
            </h2>
            <nav className="mt-4 space-y-3 text-sm">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block font-semibold leading-5 text-slate-700 hover:text-emerald-700"
                >
                  {section.heading}
                </a>
              ))}
              <a
                href="#top"
                className="block pt-3 border-t border-slate-100 font-bold text-slate-400 hover:text-slate-700"
              >
                Back to top
              </a>
            </nav>
          </div>
        </aside>
      </div>
    </main>
  );
}
