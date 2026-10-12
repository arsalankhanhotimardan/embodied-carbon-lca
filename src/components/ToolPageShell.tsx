import type { ReactNode } from "react";
import Link from "next/link";
import { jsonLdString } from "@/lib/json-ld";

const SITE = "https://greenengineeringtools.com";

type Faq = { question: string; answer: string };
type Crumb = { label: string; href?: string };

type Props = {
  title: string;
  eyebrow: string;
  intro: string;
  path: string;
  crumbs: Crumb[]; // between Home and the current page
  tool: ReactNode;
  faqs: Faq[];
  related: { href: string; title: string }[];
  disclaimer: ReactNode;
  appName?: string;
  description: string;
  children: ReactNode;
};

export default function ToolPageShell({ title, eyebrow, intro, path, crumbs, tool, faqs, related, disclaimer, appName, description, children }: Props) {
  const url = `${SITE}${path}`;
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: appName ?? title,
      url,
      description,
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
        ...crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 2, name: c.label, item: c.href ? `${SITE}${c.href}` : url })),
        { "@type": "ListItem", position: crumbs.length + 2, name: title, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    },
  ];

  return (
    <div className="min-w-0 bg-gradient-to-b from-emerald-50 via-white to-slate-50">
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(s) }} />
      ))}
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
          <Link href="/" className="hover:text-emerald-700">Home</Link>
          {crumbs.map((c) => (
            <span key={c.label} className="contents">
              <span>/</span>
              {c.href ? <Link href={c.href} className="hover:text-emerald-700">{c.label}</Link> : <span>{c.label}</span>}
            </span>
          ))}
          <span>/</span>
          <span className="text-slate-700">{title}</span>
        </nav>

        <header className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
          <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">{intro}</p>
          <p className="mt-3 text-xs font-bold text-slate-500">Free · No signup · Runs in your browser</p>
        </header>

        <div className="mt-8">{tool}</div>

        <article className="mt-10 space-y-10 rounded-3xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm sm:p-8 lg:p-10">
          {children}

          <section>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Frequently asked questions</h2>
            <div className="mt-5 space-y-3">
              {faqs.map((faq) => (
                <details key={faq.question} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <summary className="cursor-pointer font-black text-slate-900">{faq.question}</summary>
                  <p className="mt-3 text-sm leading-6 text-slate-700">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-950">Related tools and guides</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <Link key={r.href} href={r.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-black text-slate-900 transition hover:border-emerald-300 hover:bg-emerald-50">
                  {r.title} →
                </Link>
              ))}
            </div>
          </section>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">{disclaimer}</div>
        </article>
      </div>
    </div>
  );
}
