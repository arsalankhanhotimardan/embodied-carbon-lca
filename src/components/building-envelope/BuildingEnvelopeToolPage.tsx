import type React from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import PageHero from "@/components/site/PageHero";
import BuildingEnvelopeDesigner from "./BuildingEnvelopeDesigner";
import ThermalValueConverter from "./ThermalValueConverter";

type Mode = "assembly" | "insulation" | "heat-loss" | "retrofit";
type Scenario = "general" | "attic" | "blown" | "r-value" | "u-value" | "heat-loss" | "carbon";

type Section = { title: string; body: React.ReactNode };
type Faq = { question: string; answer: string };

type Props = {
  title: string;
  eyebrow: string;
  intro: string;
  canonicalPath: string;
  initialMode: Mode;
  scenario?: Scenario;
  showConverter?: "r-us" | "rsi" | "u" | null;
  sections: Section[];
  faqs: Faq[];
};

export default function BuildingEnvelopeToolPage({ title, eyebrow, intro, canonicalPath, initialMode, scenario = "general", showConverter = null, sections, faqs }: Props) {
  const url = `https://greenengineeringtools.com${canonicalPath}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: title,
    url,
    applicationCategory: "DesignApplication",
    operatingSystem: "Any modern web browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: "Green Engineering Tools", url: "https://greenengineeringtools.com" },
    description: intro,
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Green Engineering Tools", item: "https://greenengineeringtools.com" },
      { "@type": "ListItem", position: 2, name: "Building Envelope", item: "https://greenengineeringtools.com/building-envelope" },
      { "@type": "ListItem", position: 3, name: title, item: url },
    ],
  };

  return (
    <div className="min-w-0 bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <PageHero
        maxWidth="max-w-7xl"
        crumbs={[{ label: "Building Envelope", href: "/building-envelope" }, { label: title }]}
        eyebrow={eyebrow}
        title={title}
        intro={intro}
        icon={Building2}
        tint="bg-orange-50 text-orange-700"
        ring="ring-orange-100"
        badges={["No signup", "Metric + Imperial", "Transparent formulas", "Versioned engine"]}
      />
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {showConverter ? <div className="mx-auto mt-8 max-w-5xl"><ThermalValueConverter defaultMode={showConverter} /></div> : null}

        <div className="mt-10"><BuildingEnvelopeDesigner initialMode={initialMode} initialScenario={scenario} /></div>

        <article className="mx-auto mt-12 max-w-4xl space-y-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <h2 className="text-lg font-black text-emerald-950">Engineering scope and trust</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-900">The calculator is designed for transparent planning and comparison. It does not claim universal building-code certification. Product declarations, local regulations, moisture/condensation design, thermal bridges, ground-contact heat transfer and specialist HVAC sizing may require additional methods or professional review.</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-black">
              <Link href="/building-envelope/methodology" className="text-emerald-800 underline underline-offset-4">Read methodology</Link>
              <Link href="/methodology" className="text-emerald-800 underline underline-offset-4">Site methodology</Link>
              <Link href="/about" className="text-emerald-800 underline underline-offset-4">About Green Engineering Tools</Link>
            </div>
          </div>

          {sections.map((section) => <section key={section.title}><h2 className="text-2xl font-black tracking-tight text-slate-950">{section.title}</h2><div className="prose prose-slate mt-4 max-w-none text-slate-700">{section.body}</div></section>)}

          <section>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Frequently asked questions</h2>
            <div className="mt-5 space-y-3">
              {faqs.map((faq) => <details key={faq.question} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer font-black text-slate-900">{faq.question}</summary><p className="mt-3 text-sm leading-6 text-slate-700">{faq.answer}</p></details>)}
            </div>
          </section>

          <div className="rounded-2xl bg-slate-950 p-5 text-slate-200">
            <div className="text-sm font-black text-white">Related Green Engineering Tools</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Link href="/epd-carbon-calculator" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/15">EPD Carbon Calculator →</Link>
              <Link href="/embodied-carbon-calculator" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/15">Embodied Carbon Calculator →</Link>
              <Link href="/electrical" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/15">Electrical Engineering Tools →</Link>
              <a href="https://solarcalculator.greenengineeringtools.com" className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold hover:bg-white/15">Solar System Calculator ↗</a>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
