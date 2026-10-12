import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import HubHero from "@/components/site/HubHero";

export const metadata: Metadata = {
  title: "Embodied Carbon & Building LCA Guides",
  description:
    "Practical guides to embodied carbon, A1-A3, EPDs, EC3, BIM, whole-building LCA, Module D and LEED lifecycle assessment.",
  alternates: {
    canonical: "https://greenengineeringtools.com/guides",
  },
};

export default function GuidesPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <HubHero
        icon={BookOpen}
        eyebrow="Engineering knowledge base"
        title="Embodied Carbon & Building LCA Guides"
        intro="Practical, calculation-focused explanations that support the Green Engineering Tools LCA calculator. Each guide answers a different engineering question instead of repeating the same text across multiple pages."
        ctas={[{ label: "Open calculator", href: "/#calculator-workspace", primary: true }]}
      />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Link href="/methodology" className="rounded-2xl border border-slate-200 bg-white p-6 card-lift hover:border-emerald-300">
            <h2 className="text-xl font-black text-slate-950">Building LCA Methodology</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">How the calculation handles units, modules, replacements, transport and missing data.</p>
            <span className="mt-4 inline-block text-sm font-black text-emerald-700">Read guide →</span>
          </Link>
          <Link href="/embodied-carbon-calculator" className="rounded-2xl border border-slate-200 bg-white p-6 card-lift hover:border-emerald-300">
            <h2 className="text-xl font-black text-slate-950">Embodied Carbon Calculator</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">A practical guide to calculating construction material carbon from CSV or BIM quantities.</p>
            <span className="mt-4 inline-block text-sm font-black text-emerald-700">Read guide →</span>
          </Link>
          <Link href="/a1-a3-embodied-carbon" className="rounded-2xl border border-slate-200 bg-white p-6 card-lift hover:border-emerald-300">
            <h2 className="text-xl font-black text-slate-950">A1-A3 Embodied Carbon</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Product-stage GWP, declared units and fair EPD comparisons.</p>
            <span className="mt-4 inline-block text-sm font-black text-emerald-700">Read guide →</span>
          </Link>
          <Link href="/epd-carbon-calculator" className="rounded-2xl border border-slate-200 bg-white p-6 card-lift hover:border-emerald-300">
            <h2 className="text-xl font-black text-slate-950">EPD Carbon Calculator</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">How to read Environmental Product Declarations and use them in calculations.</p>
            <span className="mt-4 inline-block text-sm font-black text-emerald-700">Read guide →</span>
          </Link>
          <Link href="/ec3-epd-guide" className="rounded-2xl border border-slate-200 bg-white p-6 card-lift hover:border-emerald-300">
            <h2 className="text-xl font-black text-slate-950">EC3 EPD Guide</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Search, correct BIM names, select EPDs and understand EC3's role in LCA.</p>
            <span className="mt-4 inline-block text-sm font-black text-emerald-700">Read guide →</span>
          </Link>
          <Link href="/bim-embodied-carbon" className="rounded-2xl border border-slate-200 bg-white p-6 card-lift hover:border-emerald-300">
            <h2 className="text-xl font-black text-slate-950">BIM Embodied Carbon</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Revit and BIM schedule workflows, quantity QA and live synchronization.</p>
            <span className="mt-4 inline-block text-sm font-black text-emerald-700">Read guide →</span>
          </Link>
          <Link href="/whole-building-lca" className="rounded-2xl border border-slate-200 bg-white p-6 card-lift hover:border-emerald-300">
            <h2 className="text-xl font-black text-slate-950">Whole-Building LCA</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Scope, service life, lifecycle stages, impact categories and baseline comparison.</p>
            <span className="mt-4 inline-block text-sm font-black text-emerald-700">Read guide →</span>
          </Link>
          <Link href="/module-d-lca" className="rounded-2xl border border-slate-200 bg-white p-6 card-lift hover:border-emerald-300">
            <h2 className="text-xl font-black text-slate-950">Module D Explained</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Reuse and recycling beyond the system boundary without double counting.</p>
            <span className="mt-4 inline-block text-sm font-black text-emerald-700">Read guide →</span>
          </Link>
          <Link href="/leed-whole-building-lca" className="rounded-2xl border border-slate-200 bg-white p-6 card-lift hover:border-emerald-300">
            <h2 className="text-xl font-black text-slate-950">LEED Whole-Building LCA</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Version-aware guidance for LEED v4, v4.1 and v5.</p>
            <span className="mt-4 inline-block text-sm font-black text-emerald-700">Read guide →</span>
          </Link>
        </div>

        <div className="mt-14 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-2xl font-black text-slate-950">Suggested learning path</h2>
          <p className="mt-3 text-slate-700 leading-7">
            If you are new to embodied carbon, start with the calculator guide, then read A1-A3 and
            the EPD guide. If you work with Revit or material schedules, continue to the BIM and EC3
            guides. For certification or whole-life studies, finish with the methodology, whole-building
            LCA, Module D and LEED guides.
          </p>
        </div>
      </section>
    </main>
  );
}
