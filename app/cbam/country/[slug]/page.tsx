import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CbamInfoPage from "@/components/cbam/CbamInfoPage";
import { fmt, markupSummary, trim, versionDate, withMarkup } from "@/components/cbam/DefaultsFormat";
import { getCountryRows, includedEmissions, sectorLabel, sectorStats } from "@/lib/cbam-public-reference";

// Rendered on every request. ISR / prerendered dynamic routes do not work on the Cloudflare (OpenNext) deployment.
export const dynamic = "force-dynamic";
const MAX_ROWS_PER_SECTOR = 120;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCountryRows(slug);
  if (!data) return { title: "CBAM country not found", robots: { index: false } };
  const name = data.rows[0].country;
  const codes = new Set(data.rows.map((r) => r.cnDigits)).size;
  return {
    title: `CBAM Default Emissions for Goods from ${name}`,
    description: `EU CBAM default values for ${name}: ${codes} covered CN codes with direct, indirect and total emissions per tonne, mark-ups for 2026–2028 and links to each product.`,
    alternates: { canonical: `/cbam/country/${slug}` },
  };
}

export default async function CbamCountryPage({ params }: Props) {
  const { slug } = await params;
  const data = await getCountryRows(slug);
  if (!data) notFound();

  const { rows, version } = data;
  const name = rows[0].country;
  const stats = sectorStats(rows);
  const codeCount = new Set(rows.map((r) => r.cnDigits)).size;
  const steel = stats.find((s) => s.sector === "iron_steel");
  const alu = stats.find((s) => s.sector === "aluminium");
  const bySector = new Map<string, typeof rows>();
  for (const row of rows) bySector.set(row.sector ?? "other", [...(bySector.get(row.sector ?? "other") ?? []), row]);

  const faqs = [
    {
      question: `Which goods from ${name} have CBAM default values?`,
      answer: `The Commission's default values list ${codeCount} CN codes for ${name}${stats.length ? `, across ${stats.map((s) => `${s.label.toLowerCase()} (${s.codes})`).join(", ")}` : ""}.`,
    },
    ...(steel && steel.min !== null && steel.max !== null
      ? [{ question: `What are the default emissions for steel from ${name}?`, answer: `Default values for iron and steel from ${name} range from ${fmt(steel.min)} to ${fmt(steel.max)} tCO₂e per tonne (median ${fmt(steel.median)}) before the mark-up. Only direct emissions count for iron and steel.` }]
      : []),
    ...(alu && alu.min !== null && alu.max !== null
      ? [{ question: `What are the default emissions for aluminium from ${name}?`, answer: `Default values for aluminium from ${name} range from ${fmt(alu.min)} to ${fmt(alu.max)} tCO₂e per tonne (median ${fmt(alu.median)}) before the mark-up. Only direct emissions count for aluminium.` }]
      : []),
    {
      question: `Should I use default values or actual emissions for imports from ${name}?`,
      answer: "Default values are a fallback with a mark-up. If your supplier can provide verified installation-level emissions, actual values are often lower and can reduce certificate cost, so compare both in the CBAM calculator.",
    },
    {
      question: "How is the default-value mark-up applied?",
      answer: `The Commission adds a mark-up that grows over time. ${markupSummary()
        .map((m) => `${m.label}: ${m.y2026} in 2026, ${m.y2027} in 2027, ${m.y2028} from 2028`)
        .join("; ")}.`,
    },
  ];

  return (
    <CbamInfoPage
      title={`CBAM Default Values for Goods from ${name}`}
      eyebrow={`Country guide • ${codeCount} CN codes`}
      intro={`Default embedded-emission values published by the European Commission for goods imported from ${name}, by sector and CN code, with the 2026–2028 mark-up. Use them when verified supplier data is not available.`}
      path={`/cbam/country/${slug}`}
      parent={{ label: "Countries", href: "/cbam/country" }}
      updated={versionDate(version)}
      faqs={faqs}
    >
      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Default emissions by sector</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">tCO₂e per tonne of product that counts towards the CBAM obligation (direct only for iron and steel, aluminium, hydrogen and electricity; direct plus indirect otherwise), before and after the year-specific mark-up.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2">Sector</th>
                <th className="px-3 py-2 text-right">CN codes</th>
                <th className="px-3 py-2 text-right">Lowest</th>
                <th className="px-3 py-2 text-right">Median</th>
                <th className="px-3 py-2 text-right">Highest</th>
                <th className="px-3 py-2 text-right">Median 2026</th>
                <th className="px-3 py-2 text-right">Median 2028+</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.label} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-black text-slate-900">{s.label}</td>
                  <td className="px-3 py-2 text-right">{s.codes}</td>
                  <td className="px-3 py-2 text-right">{fmt(s.min)}</td>
                  <td className="px-3 py-2 text-right">{fmt(s.median)}</td>
                  <td className="px-3 py-2 text-right">{fmt(s.max)}</td>
                  <td className="px-3 py-2 text-right">{fmt(withMarkup(s.median, s.sector, 2026))}</td>
                  <td className="px-3 py-2 text-right">{fmt(withMarkup(s.median, s.sector, 2028))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Median columns include the mark-up for that year. Dataset: {version}.</p>
      </section>

      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Mark-up on default values</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[360px] border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
              <tr><th className="px-3 py-2">Sector</th><th className="px-3 py-2 text-right">2026</th><th className="px-3 py-2 text-right">2027</th><th className="px-3 py-2 text-right">2028+</th></tr>
            </thead>
            <tbody>
              {markupSummary().map((m) => (
                <tr key={m.sector} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-black text-slate-900">{m.label}</td>
                  <td className="px-3 py-2 text-right">{m.y2026}</td>
                  <td className="px-3 py-2 text-right">{m.y2027}</td>
                  <td className="px-3 py-2 text-right">{m.y2028}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {[...bySector.entries()].map(([key, list]) => (
        <section key={key}>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">{sectorLabel(key === "other" ? null : key)} from {name}</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-3 py-2">CN code</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-right">Direct</th>
                  <th className="px-3 py-2 text-right">Indirect</th>
                  <th className="px-3 py-2 text-right">Counts toward CBAM</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, MAX_ROWS_PER_SECTOR).map((r, i) => (
                  <tr key={`${r.cnDigits}-${r.routeIndicator ?? i}`} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 font-black"><Link href={`/cbam/cn/${r.cnDigits}`} className="text-emerald-700 underline underline-offset-2">{r.cnCode}</Link></td>
                    <td className="px-3 py-2 text-slate-600">{trim(r.description)}{r.routeLabel ? <span className="block text-xs text-slate-400">{r.routeLabel}</span> : null}</td>
                    <td className="px-3 py-2 text-right">{fmt(r.direct)}</td>
                    <td className="px-3 py-2 text-right">{fmt(r.indirect)}</td>
                    <td className="px-3 py-2 text-right font-black">{fmt(includedEmissions(r))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length > MAX_ROWS_PER_SECTOR ? (
            <p className="mt-2 text-xs text-slate-500">Showing the first {MAX_ROWS_PER_SECTOR} of {list.length} entries. Use the <Link href="/cbam/cn-code-lookup" className="font-bold text-emerald-700 underline underline-offset-2">CN code lookup</Link> to search all of them.</p>
          ) : null}
        </section>
      ))}

      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">From default value to cost</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 leading-7">
          <li>Take the &ldquo;Counts toward CBAM&rdquo; value for your CN code and multiply by the year&apos;s mark-up.</li>
          <li>Multiply by the tonnes you import to get embedded emissions.</li>
          <li>Deduct the free-allocation adjustment and any carbon price paid abroad; the <Link href="/cbam-calculator" className="font-bold text-emerald-700 underline underline-offset-2">CBAM calculator</Link> does this for you.</li>
          <li>Multiply by the <Link href="/cbam/certificate-price" className="font-bold text-emerald-700 underline underline-offset-2">certificate price</Link>.</li>
        </ol>
      </section>
    </CbamInfoPage>
  );
}
