import type { Metadata } from "next";
import Link from "next/link";
import CbamInfoPage from "@/components/cbam/CbamInfoPage";
import { trim } from "@/components/cbam/DefaultsFormat";
import { listCnCodes, sectorLabel } from "@/lib/cbam-public-reference";

// Always read live data: never bake an empty list into a cached page if the database is briefly unavailable.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CBAM CN Code List | Covered Goods With Default Emissions",
  description:
    "Browse every CN code with CBAM default values, grouped by sector: iron and steel, aluminium, cement, fertilisers, hydrogen and electricity. Open a code to compare countries.",
  alternates: { canonical: "/cbam/cn" },
};

export default async function CbamCnIndexPage() {
  const codes = await listCnCodes();
  const groups = new Map<string, typeof codes>();
  for (const c of codes) groups.set(c.sector ?? "other", [...(groups.get(c.sector ?? "other") ?? []), c]);

  return (
    <CbamInfoPage
      title="CBAM CN Code List"
      eyebrow="Covered goods by sector"
      intro="Every CN code with Commission default values, grouped by sector. Open a code to compare default emissions across countries of origin."
      path="/cbam/cn"
      updated="2026-10-12"
      faqs={[
        {
          question: "How do I know if my product is covered by CBAM?",
          answer: "Find its 8-digit CN code on the customs declaration or tariff, then look it up here. Coverage is decided by CN code, not by what the product is called.",
        },
        {
          question: "Why are some CN codes listed with several rows per country?",
          answer: "Some goods, such as steel, have different default values depending on the production route (for example BF/BOF or scrap/EAF), so each route has its own row.",
        },
      ]}
    >
      {[...groups.entries()].map(([key, list]) => (
        <section key={key}>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">
            {sectorLabel(key === "other" ? null : key)} <span className="text-base font-bold text-slate-500">({list.length} codes)</span>
          </h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {list.map((c) => (
              <li key={c.digits}>
                <Link href={`/cbam/cn/${c.digits}`} className="block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-emerald-300 hover:bg-emerald-50">
                  <span className="font-black text-slate-900">{c.cnCode}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-600">{trim(c.description, 90)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </CbamInfoPage>
  );
}
