import type { Metadata } from "next";
import CbamInfoPage from "@/components/cbam/CbamInfoPage";
import CertificateCostQuick from "@/components/cbam/CertificateCostQuick";
import PriceChart from "@/components/cbam/PriceChart";
import { getOfficialCbamPrices, type PublicCbamPrice } from "@/lib/cbam-public-prices";

// Read the latest official price on every request (cached revalidation is not available on the Cloudflare deployment).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CBAM Certificate Price Today | Official Quarterly Prices",
  description:
    "Current EU CBAM certificate price in € per tonne CO₂e, with the official 2026 quarterly history, when the next price is published, and a quick exposure calculator.",
  alternates: { canonical: "/cbam/certificate-price" },
  openGraph: {
    title: "CBAM Certificate Price Tracker",
    description: "Official quarterly CBAM certificate prices for 2026 and weekly prices from 2027, updated automatically.",
    url: "https://greenengineeringtools.com/cbam/certificate-price",
    type: "website",
  },
};

const label = (p: PublicCbamPrice) => (p.periodType === "quarterly" ? p.periodKey.replace("-", " ") : p.periodKey);
const fmt = (d: string | null) =>
  d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";

export default async function CbamCertificatePricePage() {
  const { prices, live } = await getOfficialCbamPrices();
  const latest = prices[prices.length - 1];
  const previous = prices.length > 1 ? prices[prices.length - 2] : null;
  const change = previous ? latest.price - previous.price : null;
  const updated = (latest.publishedAt ?? new Date().toISOString()).slice(0, 10);
  const tableRows = [...prices].reverse().slice(0, 30);

  return (
    <CbamInfoPage
      title="CBAM Certificate Price Tracker"
      eyebrow="Official prices • 2026 quarterly • 2027+ weekly"
      intro="The price importers pay per CBAM certificate is set by the European Commission from EU ETS auction results. Here is the latest official price, the full history, and when the next one is due."
      path="/cbam/certificate-price"
      updated={updated}
      faqs={[
        {
          question: "How is the CBAM certificate price calculated?",
          answer:
            "For 2026 imports it is the quarterly average of the EU ETS auction clearing prices, calculated by the Commission in the first calendar week after the quarter ends. From 2027 the price is a weekly average.",
        },
        {
          question: "When is the next CBAM certificate price published?",
          answer:
            "Quarterly prices for 2026 are published in the first calendar week after each quarter ends. The Q3 2026 price was due on 5 October 2026 and the Q4 2026 price is due in the first week of January 2027.",
        },
        {
          question: "When can I buy CBAM certificates?",
          answer:
            "Certificate sales through the CBAM Registry open on 1 February 2027. Certificates for 2026 imports are surrendered with the first annual declaration, due 30 September 2027.",
        },
        {
          question: "Is the CBAM price the same as the EU ETS price?",
          answer:
            "It is derived from EU ETS auction prices, but it is a published average for a set period, not the live market price. For 2026 it is fixed per quarter.",
        },
      ]}
      tool={
        <div className="space-y-6">
          <section className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-black uppercase tracking-widest text-emerald-700">Latest official price · {label(latest)}</div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-5xl font-black text-slate-950">€{latest.price.toFixed(2)}</span>
              <span className="text-sm font-bold text-slate-600">per tonne CO₂e</span>
              {change !== null ? (
                <span className={`text-sm font-black ${change >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {change >= 0 ? "▲" : "▼"} €{Math.abs(change).toFixed(2)} vs {label(previous!)}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Applies to {fmt(latest.periodStart)} – {fmt(latest.periodEnd)} · Published {fmt(latest.publishedAt)}
              {live ? "" : " · Showing the last verified figure; the live feed is temporarily unavailable"}
            </p>
          </section>
          <CertificateCostQuick price={latest.price} periodLabel={label(latest)} />
        </div>
      }
    >
      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">Price history</h2>
        <div className="mt-5">
          <PriceChart prices={prices} />
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <caption className="sr-only">Official CBAM certificate prices</caption>
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="py-2 pr-4">Period</th>
                <th className="py-2 pr-4">Applies</th>
                <th className="py-2 pr-4">Published</th>
                <th className="py-2 text-right">€ / tCO₂e</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((p) => (
                <tr key={p.periodKey} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-bold text-slate-900">{label(p)}</td>
                  <td className="py-2 pr-4">{fmt(p.periodStart)} – {fmt(p.periodEnd)}</td>
                  <td className="py-2 pr-4">{fmt(p.publishedAt)}</td>
                  <td className="py-2 text-right font-black text-slate-900">{p.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Source: European Commission, Taxation and Customs Union,{" "}
          <a
            href="https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/price-cbam-certificates_en"
            className="font-bold text-emerald-700 underline underline-offset-2"
            rel="noopener noreferrer"
          >
            Price of CBAM certificates
          </a>
          . This page re-checks the data every hour.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-black tracking-tight text-slate-950">How the price works</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-7">
          <li><strong>2026 imports:</strong> one price per quarter, the average EU ETS auction clearing price for that quarter.</li>
          <li><strong>2027 onward:</strong> a weekly average price.</li>
          <li><strong>Gross vs net cost:</strong> the price is multiplied by the certificates you must surrender, which depend on embedded emissions, the free-allocation adjustment and any carbon price paid abroad.</li>
        </ul>
      </section>
    </CbamInfoPage>
  );
}
