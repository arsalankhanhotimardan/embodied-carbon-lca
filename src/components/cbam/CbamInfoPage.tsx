import type { ReactNode } from "react";
import Link from "next/link";
import { Ship } from "lucide-react";
import { jsonLdString } from "@/lib/json-ld";
import PageHero from "@/components/site/PageHero";
import HubHero from "@/components/site/HubHero";

const SITE_URL = "https://greenengineeringtools.com";

type Faq = { question: string; answer: string };

type Props = {
  title: string;
  eyebrow: string;
  intro: string;
  path: string;
  updated: string; // ISO date, shown on the page and in structured data
  tool?: ReactNode;
  parent?: { label: string; href: string };
  variant?: "page" | "hub";
  faqs?: Faq[];
  children?: ReactNode;
};

const related = [
  { href: "/cbam/certificate-price", title: "CBAM certificate price tracker", text: "Quarterly and weekly official prices." },
  { href: "/cbam/do-i-need-cbam", title: "Do I need to comply with CBAM?", text: "50-tonne threshold checker." },
  { href: "/cbam/cn-code-lookup", title: "CBAM CN code lookup", text: "Default emissions by country and CN code." },
  { href: "/cbam/country", title: "CBAM by country", text: "Default emissions for goods from each origin country." },
  { href: "/cbam/cn", title: "CBAM CN code index", text: "Every covered CN code with default emissions by country." },
  { href: "/cbam/deadlines", title: "CBAM deadlines and checklist", text: "Key dates and a compliance checklist." },
  { href: "/cbam-calculator", title: "Full CBAM cost calculator", text: "Multi-year certificate cost estimate." },
];

export default function CbamInfoPage({ title, eyebrow, intro, path, updated, tool, parent, variant = "page", faqs = [], children }: Props) {
  const url = `${SITE_URL}${path}`;
  const updatedLabel = new Date(`${updated}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const schemas: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      url,
      description: intro,
      dateModified: updated,
      isPartOf: { "@type": "WebSite", name: "Green Engineering Tools", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Green Engineering Tools", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "CBAM", item: `${SITE_URL}/cbam` },
        ...(parent ? [{ "@type": "ListItem", position: 3, name: parent.label, item: `${SITE_URL}${parent.href}` }] : []),
        { "@type": "ListItem", position: parent ? 4 : 3, name: title, item: url },
      ],
    },
  ];
  if (faqs.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  const crumbs = [
    ...(path === "/cbam" ? [] : [{ label: "CBAM", href: "/cbam" }]),
    ...(parent ? [{ label: parent.label, href: parent.href }] : []),
    { label: path === "/cbam" ? "CBAM" : title },
  ];

  return (
    <div className="min-w-0 bg-slate-50">
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(schema) }} />
      ))}
      {variant === "hub" ? (
        <HubHero eyebrow={eyebrow} title={title} intro={intro} icon={Ship} chips={["Free, no signup", `Updated ${updatedLabel}`, "Official EU data"]} />
      ) : (
        <PageHero crumbs={crumbs} eyebrow={eyebrow} title={title} intro={intro} icon={Ship} tint="bg-teal-50 text-teal-700" ring="ring-teal-100" badges={["Free", "No signup", `Updated ${updatedLabel}`]} />
      )}
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {tool ? <div>{tool}</div> : null}

        <article className={`${tool ? "mt-10" : ""} space-y-10 rounded-3xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm sm:p-8 lg:p-10`}>
          {children}

          {faqs.length ? (
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
          ) : null}

          <section>
            <h2 className="text-xl font-black text-slate-950">More free CBAM tools</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {related
                .filter((item) => item.href !== path)
                .map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-300 hover:bg-emerald-50">
                    <div className="font-black text-slate-900">{item.title} →</div>
                    <div className="mt-1 text-sm text-slate-600">{item.text}</div>
                  </Link>
                ))}
            </div>
          </section>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            <strong>Planning information, not legal advice.</strong> CBAM rules are amended often. Check dates, thresholds and prices against the
            Regulation (EU) 2023/956 as amended and the European Commission&apos;s official CBAM pages before making compliance or purchasing decisions.
          </div>
        </article>
      </div>
    </div>
  );
}
