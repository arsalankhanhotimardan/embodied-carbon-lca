import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Zap } from "lucide-react";
import PageHero from "@/components/site/PageHero";
import QuickTool from "@/components/electrical/quick/QuickTool";
import QuickTables from "@/components/electrical/quick/QuickTables";
import { EXISTING_ELECTRICAL_LINKS, QUICK_TOOLS, quickToolBySlug } from "@/data/electrical-quick-tools";
import { jsonLdString } from "@/lib/json-ld";

const SITE = "https://greenengineeringtools.com";

export const dynamicParams = false;

export function generateStaticParams() {
  return QUICK_TOOLS.map((t) => ({ slug: t.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = quickToolBySlug(slug);
  if (!page) return {};
  const url = `${SITE}/electrical/${page.slug}`;
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: page.title, description: page.metaDescription, url, type: "website" },
  };
}

export default async function QuickElectricalPage({ params }: Props) {
  const { slug } = await params;
  const page = quickToolBySlug(slug);
  if (!page) notFound();

  const url = `${SITE}/electrical/${page.slug}`;
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: page.title,
      url,
      description: page.metaDescription,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any modern web browser",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: "Green Engineering Tools", url: SITE },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Green Engineering Tools", item: SITE },
        { "@type": "ListItem", position: 2, name: "Electrical Tools", item: `${SITE}/electrical` },
        { "@type": "ListItem", position: 3, name: page.title, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    },
  ];

  const related = page.related
    .map((s) => {
      const quick = quickToolBySlug(s);
      if (quick) return { href: `/electrical/${s}`, title: quick.title };
      if (EXISTING_ELECTRICAL_LINKS[s]) return { href: `/electrical/${s}`, title: EXISTING_ELECTRICAL_LINKS[s] };
      return null;
    })
    .filter((x): x is { href: string; title: string } => x !== null);

  return (
    <div className="min-w-0 bg-slate-50">
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(s) }} />
      ))}
      <PageHero
        crumbs={[{ label: "Electrical tools", href: "/electrical" }, { label: page.title }]}
        eyebrow={page.eyebrow}
        title={page.title}
        intro={page.intro}
        icon={Zap}
        tint="bg-blue-50 text-blue-700"
        ring="ring-blue-100"
        badges={["Free", "No signup", "Runs in your browser", "Formulas shown"]}
      />
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div>
          <QuickTool config={page.tool} />
        </div>

        <article className="mt-10 space-y-10 rounded-3xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm sm:p-8 lg:p-10">
          <section>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">{page.formulas.heading}</h2>
            <ul className="mt-4 space-y-2">
              {page.formulas.lines.map((line) => (
                <li key={line} className="break-words rounded-xl bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800">{line}</li>
              ))}
            </ul>
            {page.formulas.note ? <p className="mt-3 text-sm leading-6 text-slate-600">{page.formulas.note}</p> : null}
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">{page.example.heading}</h2>
            <p className="mt-3 leading-7">{page.example.body}</p>
          </section>

          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{section.heading}</h2>
              {section.paragraphs.map((p) => (
                <p key={p} className="mt-3 leading-7">{p}</p>
              ))}
            </section>
          ))}

          {page.tables.map((spec, i) => (
            <QuickTables key={i} spec={spec} />
          ))}

          <section>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Frequently asked questions</h2>
            <div className="mt-5 space-y-3">
              {page.faqs.map((faq) => (
                <details key={faq.question} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <summary className="cursor-pointer font-black text-slate-900">{faq.question}</summary>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">Related calculators</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <Link key={r.href} href={r.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black text-slate-900 transition hover:border-emerald-300 hover:bg-emerald-50">
                  {r.title} →
                </Link>
              ))}
              <Link href="/electrical" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black text-slate-900 transition hover:border-emerald-300 hover:bg-emerald-50">
                All electrical calculators →
              </Link>
            </div>
          </section>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            <strong>Planning information, not a design certificate.</strong> Results assume balanced, steady loads and the values you enter. Protective devices, cable sizing and installation must follow your local electrical code and be verified by a qualified electrician or engineer.
          </div>
        </article>
      </div>
    </div>
  );
}
