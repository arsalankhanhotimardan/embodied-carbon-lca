import type { Metadata } from "next";
import Link from "next/link";
import CbamInfoPage from "@/components/cbam/CbamInfoPage";
import { listCountries } from "@/lib/cbam-public-reference";

// Always read live data: never bake an empty list into a cached page if the database is briefly unavailable.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CBAM Default Emissions by Country | Origin Country Guide",
  description:
    "Browse EU CBAM default emission values by country of origin. See which goods are covered and the default direct, indirect and total emissions per tonne for each country.",
  alternates: { canonical: "/cbam/country" },
};

export default async function CbamCountryIndexPage() {
  const countries = await listCountries();
  return (
    <CbamInfoPage
      title="CBAM Default Emissions by Country"
      eyebrow="Country of origin guide"
      intro="Pick the country your goods come from to see the European Commission's default embedded-emission values by sector and CN code, with the mark-up that applies in 2026, 2027 and from 2028."
      path="/cbam/country"
      updated="2026-10-12"
      faqs={[
        {
          question: "Why do CBAM default values depend on the country?",
          answer: "The Commission publishes default emissions per tonne for each exporting country, reflecting typical production in that country, with a fallback for countries without specific data.",
        },
        {
          question: "When are default values used?",
          answer: "When the producer cannot supply verified, installation-specific emissions data. Actual verified data can be lower than the default, which reduces certificate cost.",
        },
      ]}
    >
      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">{countries.length} countries and territories</h2>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {countries.map((c) => (
            <li key={c.slug}>
              <Link href={`/cbam/country/${c.slug}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 transition hover:border-emerald-300 hover:bg-emerald-50">
                <span>{c.name}</span>
                <span className="text-xs font-bold text-slate-500">{c.goods} entries</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </CbamInfoPage>
  );
}
