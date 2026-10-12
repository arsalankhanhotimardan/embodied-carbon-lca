import type { Metadata } from "next";
import Link from "next/link";
import CbamInfoPage from "@/components/cbam/CbamInfoPage";

export const metadata: Metadata = {
  title: "EU CBAM Tools & Guides | Free Calculators, Prices, Deadlines",
  description:
    "Free EU CBAM resources: certificate price tracker, 50-tonne threshold checker, CN code lookup with default emissions, deadlines checklist and a full cost calculator.",
  alternates: { canonical: "/cbam" },
};

const tools = [
  { href: "/cbam/certificate-price", title: "Certificate price tracker", text: "Latest official quarterly price, history and when the next one is due." },
  { href: "/cbam/do-i-need-cbam", title: "Do I need to comply?", text: "Check your yearly tonnage against the 50-tonne threshold." },
  { href: "/cbam/cn-code-lookup", title: "CN code lookup", text: "Default direct, indirect and total emissions by country and CN code." },
  { href: "/cbam/deadlines", title: "Deadlines and checklist", text: "Every key date to 2027 and a printable step-by-step checklist." },
  { href: "/cbam-calculator", title: "CBAM cost calculator", text: "Multi-year certificate cost estimate with default or actual emissions." },
  { href: "/cbam-calculator/bulk", title: "Bulk CSV calculator", text: "Upload a portfolio of shipments and get total exposure." },
];

export default function CbamHubPage() {
  return (
    <CbamInfoPage
      title="EU CBAM Tools and Guides"
      eyebrow="Carbon Border Adjustment Mechanism"
      intro="Free, no-signup tools for importers, exporters and consultants preparing for the EU carbon border levy on steel, aluminium, cement, fertilisers, hydrogen and electricity."
      path="/cbam"
      updated="2026-10-12"
      faqs={[
        {
          question: "What is CBAM?",
          answer:
            "The Carbon Border Adjustment Mechanism is an EU measure that charges importers for the carbon emitted in producing certain goods abroad, so imported products face a carbon cost comparable to EU-made ones.",
        },
        {
          question: "Which goods does CBAM cover?",
          answer: "Cement, iron and steel, aluminium, fertilisers, hydrogen and electricity, plus certain downstream products. Coverage is defined by CN code.",
        },
        {
          question: "Who pays CBAM?",
          answer: "The EU importer (the authorised declarant) buys and surrenders the certificates. Non-EU producers are affected indirectly, because importers need their emissions data.",
        },
      ]}
    >
      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Free CBAM tools</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-emerald-300 hover:bg-emerald-50">
              <div className="font-black text-slate-950">{tool.title} →</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{tool.text}</p>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">CBAM in four steps</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 leading-7">
          <li>Identify the CN code of each imported product.</li>
          <li>Find its embedded emissions, using supplier data or the Commission&apos;s default values.</li>
          <li>Subtract the free-allocation adjustment and any carbon price paid abroad.</li>
          <li>Surrender certificates priced at the official CBAM certificate price.</li>
        </ol>
      </section>
    </CbamInfoPage>
  );
}
