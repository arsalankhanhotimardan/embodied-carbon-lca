import type { Metadata } from "next";
import Link from "next/link";
import CbamInfoPage from "@/components/cbam/CbamInfoPage";
import Checklist, { type ChecklistItem } from "@/components/cbam/Checklist";
import { FREE_ALLOCATION_CBAM_FACTOR } from "@/lib/cbam-regulatory-calendar";

export const metadata: Metadata = {
  title: "CBAM Deadlines 2026–2027 & Compliance Checklist",
  description:
    "Key EU CBAM dates: certificate price publication, certificate sales from 1 February 2027, first annual declaration on 30 September 2027, plus a free printable compliance checklist.",
  alternates: { canonical: "/cbam/deadlines" },
};

const timeline = [
  { date: "1 Jan 2026", title: "Definitive period begins", text: "Importers above the threshold must account for the embedded emissions of CBAM goods imported from this date." },
  { date: "7 Apr 2026", title: "First certificate price published", text: "The Q1 2026 price (€75.36) was the first quarterly price published by the Commission." },
  { date: "5 Oct 2026", title: "Q3 2026 price due", text: "Quarterly prices are calculated in the first calendar week after the quarter ends." },
  { date: "Jan 2027", title: "Q4 2026 price due; weekly prices start", text: "From 2027 imports the certificate price becomes a weekly average." },
  { date: "1 Feb 2027", title: "Certificate sales open", text: "Authorised declarants can buy certificates through the CBAM Registry." },
  { date: "30 Sep 2027", title: "First annual declaration and surrender", text: "The declaration for 2026 imports and the matching certificates are due (moved from 31 May by Regulation (EU) 2025/2083)." },
];

const items: ChecklistItem[] = [
  { id: "scope", title: "Confirm which of your goods are in scope", detail: "Match each product to its CN code with the CN code lookup. Scope is decided by CN code, not by product name." },
  { id: "threshold", title: "Track net mass against the 50-tonne threshold", detail: "Keep a running total per calendar year for cement, iron and steel, aluminium and fertilisers." },
  { id: "authorised", title: "Apply for authorised-declarant status", detail: "Needed if you will exceed the threshold. Apply through your national competent authority via the CBAM Registry." },
  { id: "suppliers", title: "Request emissions data from every supplier", detail: "Ask for installation-level direct and indirect emissions per tonne, ideally verified, for each CN code." },
  { id: "defaults", title: "Compare default and actual emissions", detail: "Default values carry a mark-up. Actual verified data is often lower, so run both in the calculator." },
  { id: "price", title: "Budget at the published certificate price", detail: "Use the quarterly price for 2026 and weekly prices from 2027." },
  { id: "carbon-price", title: "Collect evidence of any carbon price paid abroad", detail: "A carbon price paid in the country of origin can reduce certificates, but needs documentary proof." },
  { id: "records", title: "Keep records for each shipment", detail: "Customs reference, CN code, net mass, origin, installation and emissions evidence." },
  { id: "declaration", title: "Prepare the annual declaration", detail: "First due 30 September 2027 for 2026 imports, together with the certificates to surrender." },
];

const factorRows = Object.entries(FREE_ALLOCATION_CBAM_FACTOR).map(([year, factor]) => ({ year, factor }));

export default function CbamDeadlinesPage() {
  return (
    <CbamInfoPage
      title="CBAM Deadlines 2026–2027 and Compliance Checklist"
      eyebrow="Key dates • free printable checklist"
      intro="Every date an EU importer or non-EU exporter needs to track for the CBAM definitive period, plus a step-by-step checklist you can tick off and print."
      path="/cbam/deadlines"
      updated="2026-10-12"
      faqs={[
        {
          question: "When is the first CBAM annual declaration due?",
          answer: "30 September 2027, covering goods imported in 2026. The date was moved from 31 May 2027 by the 2025 simplification (Regulation (EU) 2025/2083).",
        },
        {
          question: "When do CBAM certificate sales start?",
          answer: "1 February 2027, through the CBAM Registry.",
        },
        {
          question: "What happens if I do not cover my emissions with certificates?",
          answer:
            "The regulation provides for a penalty per uncovered tonne of CO₂e, which is indexed to inflation (around €100 in the original text), and you still owe the missing certificates. Check the current figure in the regulation.",
        },
        {
          question: "How fast does free allocation phase out?",
          answer: "The CBAM factor falls from 97.5% in 2026 to 0% in 2034, so the share of emissions that must be covered by certificates rises each year.",
        },
      ]}
    >
      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">CBAM timeline</h2>
        <ol className="mt-5 space-y-4 border-l-2 border-emerald-200 pl-5">
          {timeline.map((t) => (
            <li key={t.date} className="relative">
              <span className="absolute -left-[1.65rem] top-1.5 h-3 w-3 rounded-full bg-emerald-500" aria-hidden="true" />
              <div className="text-xs font-black uppercase tracking-widest text-emerald-700">{t.date}</div>
              <div className="font-black text-slate-950">{t.title}</div>
              <p className="text-sm leading-6 text-slate-600">{t.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-slate-600">
          Current and past prices are on the <Link href="/cbam/certificate-price" className="font-bold text-emerald-700 underline underline-offset-2">certificate price tracker</Link>.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">CBAM compliance checklist</h2>
        <div className="mt-5">
          <Checklist items={items} />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Free-allocation phase-out</h2>
        <p className="mt-3 leading-7">The CBAM factor is the share of free EU ETS allocation that CBAM treats as phased out. As it falls, more of your emissions need certificates.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-4">Year</th>
                <th className="py-2 text-right">CBAM factor</th>
              </tr>
            </thead>
            <tbody>
              {factorRows.map((row) => (
                <tr key={row.year} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-bold text-slate-900">{row.year}</td>
                  <td className="py-2 text-right">{(row.factor * 100).toFixed(1).replace(/\.0$/, "")}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </CbamInfoPage>
  );
}
