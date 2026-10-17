import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CbamInfoPage from "@/components/cbam/CbamInfoPage";
import { fmt, markupSummary, trim, versionDate, withMarkup } from "@/components/cbam/DefaultsFormat";
import { countrySlug, getCnRows, includedEmissions, median, sectorLabel } from "@/lib/cbam-public-reference";

// Rendered on every request. ISR / prerendered dynamic routes do not work on the Cloudflare (OpenNext) deployment.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

const shortDescription = (text: string | null) => (text ? (text.length > 48 ? `${text.slice(0, 47).trimEnd()}…` : text) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const data = await getCnRows(code);
  if (!data) return { title: "CBAM CN code not found", robots: { index: false } };
  const first = data.rows[0];
  const countries = new Set(data.rows.map((r) => r.countryNormalized)).size;
  const desc = shortDescription(first.description);
  return {
    title: `CBAM CN ${first.cnCode}${desc ? `: ${desc}` : ""} | Default Emissions`,
    description: `CBAM default emissions for CN ${first.cnCode}${first.description ? ` (${trim(first.description, 80)})` : ""} across ${countries} countries, with direct, indirect and total values per tonne and 2026–2028 mark-ups.`,
    alternates: { canonical: `/cbam/cn/${code}` },
  };
}

export default async function CbamCnPage({ params }: Props) {
  const { code } = await params;
  const data = await getCnRows(code);
  if (!data) notFound();

  const { rows, version } = data;
  const first = rows[0];
  const sector = first.sector;
  const sorted = [...rows].sort((a, b) => (includedEmissions(a) ?? Infinity) - (includedEmissions(b) ?? Infinity));
  const values = rows.map(includedEmissions).filter((v): v is number => v !== null);
  const low = sorted.find((r) => includedEmissions(r) !== null) ?? null;
  const high = [...sorted].reverse().find((r) => includedEmissions(r) !== null) ?? null;
  const med = median(values);
  const countries = new Set(rows.map((r) => r.countryNormalized)).size;
  const directOnly = sector === "iron_steel" || sector === "aluminium" || sector === "hydrogen" || sector === "electricity";
  const m26 = markupSummary().find((m) => m.sector === sector);

  const faqs = [
    {
      question: `Is CN ${first.cnCode} covered by CBAM?`,
      answer: `Yes. CN ${first.cnCode}${first.description ? ` (${trim(first.description, 120)})` : ""} appears in the Commission's CBAM default-value tables for the ${sectorLabel(sector).toLowerCase()} sector.`,
    },
    ...(low && high && values.length
      ? [
          {
            question: `What are the default emissions for CN ${first.cnCode}?`,
            answer: `Across ${countries} countries the default value that counts towards CBAM ranges from ${fmt(includedEmissions(low))} tCO₂e per tonne (${low.country}) to ${fmt(includedEmissions(high))} tCO₂e per tonne (${high.country}), with a median of ${fmt(med)}, before the year-specific mark-up.`,
          },
        ]
      : []),
    {
      question: `Do indirect emissions count for CN ${first.cnCode}?`,
      answer: directOnly
        ? `No. For ${sectorLabel(sector).toLowerCase()}, only direct emissions count towards the CBAM obligation, so the indirect column is shown for information only.`
        : `Yes. For ${sectorLabel(sector).toLowerCase()}, indirect emissions from electricity use are included together with direct emissions.`,
    },
    {
      question: "What is the mark-up on default values?",
      answer: m26 ? `For ${m26.label.toLowerCase()} the mark-up is ${m26.y2026} in 2026, ${m26.y2027} in 2027 and ${m26.y2028} from 2028.` : "The Commission adds a mark-up to default values that increases over time.",
    },
  ];

  return (
    <CbamInfoPage
      title={`CBAM CN ${first.cnCode}${shortDescription(first.description) ? `: ${shortDescription(first.description)}` : ""}`}
      eyebrow={`${sectorLabel(sector)} • CN code`}
      intro={`Official CBAM default emissions for CN ${first.cnCode}${first.description ? `, ${trim(first.description, 160)}` : ""}, compared across ${countries} countries of origin.`}
      path={`/cbam/cn/${code}`}
      parent={{ label: "CN codes", href: "/cbam/cn" }}
      updated={versionDate(version)}
      faqs={faqs}
    >
      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Summary</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ["Lowest default", low ? `${fmt(includedEmissions(low))}` : "—", low?.country ?? ""],
            ["Median", fmt(med), `${countries} countries`],
            ["Highest default", high ? `${fmt(includedEmissions(high))}` : "—", high?.country ?? ""],
          ].map(([label, value, sub]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</div>
              <div className="mt-1 text-2xl font-black text-slate-950">{value} <span className="text-sm font-bold text-slate-500">tCO₂e/t</span></div>
              <div className="text-xs text-slate-500">{sub}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Values that count towards CBAM ({directOnly ? "direct emissions only" : "direct plus indirect"}), before mark-up. Dataset: {version}.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Default emissions by country</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Sorted from lowest to highest. The 2026 column adds the Commission&apos;s mark-up for this sector.</p>
        <div className="mt-4 max-h-[40rem] overflow-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2 text-right">Direct</th>
                <th className="px-3 py-2 text-right">Indirect</th>
                <th className="px-3 py-2 text-right">Counts toward CBAM</th>
                <th className="px-3 py-2 text-right">2026 incl. mark-up</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={`${r.countryNormalized}-${r.routeIndicator ?? i}`} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2 font-black">
                    <Link href={`/cbam/country/${countrySlug(r.countryNormalized)}`} className="text-emerald-700 underline underline-offset-2">{r.country}</Link>
                    {r.routeLabel ? <span className="block text-xs font-normal text-slate-400">{r.routeLabel}</span> : null}
                  </td>
                  <td className="px-3 py-2 text-right">{fmt(r.direct)}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.indirect)}</td>
                  <td className="px-3 py-2 text-right font-black">{fmt(includedEmissions(r))}</td>
                  <td className="px-3 py-2 text-right">{fmt(withMarkup(includedEmissions(r), r.sector, 2026))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Using these values</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-7">
          <li>Embedded emissions = tonnes imported × the value for your country × the year&apos;s mark-up.</li>
          <li>If your supplier can provide verified actual emissions, compare them with the default in the <Link href="/cbam-calculator/actual-data" className="font-bold text-emerald-700 underline underline-offset-2">actual-data calculator</Link>.</li>
          <li>Convert emissions to cost with the <Link href="/cbam/certificate-price" className="font-bold text-emerald-700 underline underline-offset-2">latest certificate price</Link> and the <Link href="/cbam-calculator" className="font-bold text-emerald-700 underline underline-offset-2">CBAM calculator</Link>.</li>
        </ul>
      </section>
    </CbamInfoPage>
  );
}
