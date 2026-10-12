import type { Metadata } from "next";
import Link from "next/link";
import CbamInfoPage from "@/components/cbam/CbamInfoPage";
import CnLookup from "@/components/cbam/CnLookup";

export const metadata: Metadata = {
  title: "CBAM CN Code Lookup | Default Emissions by Country",
  description:
    "Free CBAM CN code lookup. Search by country and CN code to see whether goods are covered and the official default direct, indirect and total emissions per tonne.",
  alternates: { canonical: "/cbam/cn-code-lookup" },
};

export default function CnCodeLookupPage() {
  return (
    <CbamInfoPage
      title="CBAM CN Code Lookup"
      eyebrow="Default emissions • by country • by CN code"
      intro="Check whether a product's CN code is covered by CBAM and see the European Commission's default embedded emissions for its country of origin."
      path="/cbam/cn-code-lookup"
      updated="2026-10-12"
      tool={<CnLookup />}
      faqs={[
        {
          question: "What is a CN code?",
          answer: "The Combined Nomenclature (CN) code is the 8-digit EU customs classification of a product. CBAM covers specific CN codes in cement, iron and steel, aluminium, fertilisers, hydrogen and electricity.",
        },
        {
          question: "What are CBAM default values?",
          answer:
            "Default values are emissions per tonne of product published by the Commission by country and CN code. They are used when the producer cannot supply verified actual emissions data, and carry a mark-up that grows from 2026 to 2028.",
        },
        {
          question: "What is the difference between direct and indirect emissions?",
          answer:
            "Direct emissions come from the production process itself. Indirect emissions come from the electricity used. For some sectors, such as iron and steel and aluminium, only direct emissions are counted in the CBAM obligation.",
        },
        {
          question: "Should I use default or actual emissions?",
          answer: "Actual verified emissions can be lower than defaults, especially once the mark-up applies. Run both in the CBAM calculator and compare.",
        },
      ]}
    >
      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">How to use these numbers</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 leading-7">
          <li>Find your product&apos;s CN code and country of origin above.</li>
          <li>Multiply the total default (tCO₂e per tonne) by your imported tonnage for embedded emissions.</li>
          <li>Apply the mark-up and free-allocation adjustment, or let the <Link href="/cbam-calculator" className="font-bold text-emerald-700 underline underline-offset-2">CBAM calculator</Link> do it for you.</li>
          <li>Multiply by the <Link href="/cbam/certificate-price" className="font-bold text-emerald-700 underline underline-offset-2">certificate price</Link> for the cost.</li>
        </ol>
      </section>
    </CbamInfoPage>
  );
}
