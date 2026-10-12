import type { Metadata } from "next";
import Link from "next/link";
import CbamInfoPage from "@/components/cbam/CbamInfoPage";
import ThresholdChecker from "@/components/cbam/ThresholdChecker";

export const metadata: Metadata = {
  title: "Do I Need to Comply With CBAM? 50-Tonne Threshold Checker",
  description:
    "Free CBAM checker: enter your yearly imports of steel, aluminium, cement, fertilisers, hydrogen and electricity to see whether the 50-tonne threshold exempts you.",
  alternates: { canonical: "/cbam/do-i-need-cbam" },
};

export default function DoINeedCbamPage() {
  return (
    <CbamInfoPage
      title="Do I Need to Comply With CBAM?"
      eyebrow="50-tonne threshold checker"
      intro="Since the 2025 simplification, small importers are exempt from CBAM if they stay under 50 tonnes of covered goods a year. Enter your yearly tonnage to see which side of the line you are on."
      path="/cbam/do-i-need-cbam"
      updated="2026-10-12"
      tool={<ThresholdChecker />}
      faqs={[
        {
          question: "What is the CBAM 50-tonne threshold?",
          answer:
            "Under the 2025 simplification (Regulation (EU) 2025/2083), an importer whose cumulative net mass of cement, iron and steel, aluminium and fertilisers stays at or below 50 tonnes in a calendar year is exempt from authorised-declarant status, the annual declaration and certificates.",
        },
        {
          question: "Does the threshold apply to electricity and hydrogen?",
          answer: "No. The mass-based exemption covers cement, iron and steel, aluminium and fertilisers. Electricity and hydrogen imports are not exempted by it.",
        },
        {
          question: "Is the threshold per product or per importer?",
          answer: "It is cumulative per importer per calendar year, added up across the eligible goods categories, not per product line.",
        },
        {
          question: "What if I cross 50 tonnes part-way through the year?",
          answer:
            "Earlier imports from the same calendar year count towards the total. Once you cross the limit, your annual position includes those earlier shipments too, so keep a running tally from 1 January.",
        },
        {
          question: "I am a non-EU exporter. Does CBAM apply to me?",
          answer:
            "The legal obligation falls on the EU importer, but they will need emissions data from you. Producers who can supply verified actual emissions may help their customers avoid the higher default values.",
        },
      ]}
    >
      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">How the 50-tonne rule works</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-7">
          <li>The limit is counted in <strong>net mass</strong> (tonnes), not euros, which replaced the earlier €150 value exemption.</li>
          <li>It is a <strong>cumulative annual</strong> total per importer, across cement, iron and steel, aluminium and fertilisers.</li>
          <li><strong>Hydrogen and electricity</strong> are outside the exemption.</li>
          <li>Under the limit you are exempt from authorisation, the annual declaration and certificate purchase. Above it, all three apply.</li>
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">What to do next</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 leading-7">
          <li>Identify the CN code of each product, using the <Link href="/cbam/cn-code-lookup" className="font-bold text-emerald-700 underline underline-offset-2">CN code lookup</Link>.</li>
          <li>Total your net mass per calendar year, starting 1 January.</li>
          <li>If you are over, work through the <Link href="/cbam/deadlines" className="font-bold text-emerald-700 underline underline-offset-2">deadlines and checklist</Link>.</li>
          <li>Estimate certificate cost with the <Link href="/cbam-calculator" className="font-bold text-emerald-700 underline underline-offset-2">CBAM calculator</Link>.</li>
        </ol>
      </section>
    </CbamInfoPage>
  );
}
