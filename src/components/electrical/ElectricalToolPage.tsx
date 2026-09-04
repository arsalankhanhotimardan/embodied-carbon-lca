import Link from "next/link";
import ElectricalDesigner, { type ElectricalPresetName } from "./ElectricalDesigner";
import type { CalculationMode } from "@/lib/electrical-engine";

export default function ElectricalToolPage({
  title,
  eyebrow,
  description,
  canonicalPath,
  initialPreset,
  initialMode,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  canonicalPath: string;
  initialPreset: ElectricalPresetName;
  initialMode: CalculationMode;
  children: React.ReactNode;
}) {
  const url = `https://greenengineeringtools.com${canonicalPath}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: title,
    applicationCategory: "EngineeringApplication",
    operatingSystem: "Web Browser",
    url,
    description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    provider: {
      "@type": "Organization",
      name: "Green Engineering Tools",
      url: "https://greenengineeringtools.com",
    },
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Green Engineering Tools", item: "https://greenengineeringtools.com" },
      { "@type": "ListItem", position: 2, name: "Electrical Tools", item: "https://greenengineeringtools.com/electrical" },
      { "@type": "ListItem", position: 3, name: title, item: url },
    ],
  };

  return (
    <main className="bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <nav className="text-xs font-bold text-slate-500" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-emerald-700">Home</Link>
            <span className="px-2">/</span>
            <Link href="/electrical" className="hover:text-emerald-700">Electrical tools</Link>
          </nav>
          <div className="mt-6 max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{title}</h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">{description}</p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
              {["No signup", "AWG + mm²", "DC + AC", "Mobile friendly", "Shareable result", "Transparent formulas"].map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1.5">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-2 py-8 sm:px-6 sm:py-12">
        <ElectricalDesigner initialPreset={initialPreset} initialMode={initialMode} />
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-18">
          <div className="space-y-10 text-slate-600">
            {children}
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Related href="/electrical/voltage-drop-calculator" title="Voltage Drop Calculator" />
            <Related href="/electrical/wire-size-calculator" title="Wire Size Calculator" />
            <Related href="/electrical/wire-length-calculator" title="Wire Length Calculator" />
            <Related href="/electrical/dc-wire-size-calculator" title="DC Wire Size Calculator" />
            <Related href="/electrical/3-phase-voltage-drop-calculator" title="3-Phase Voltage Drop" />
            <Related href="/electrical/cable-power-loss-calculator" title="Cable Power Loss" />
          </div>

          <div className="mt-10 rounded-2xl border border-sky-200 bg-sky-50 p-6">
            <h2 className="text-xl font-black text-sky-950">Designing a solar system too?</h2>
            <p className="mt-2 text-sm leading-6 text-sky-900">
              Use the dedicated solar load, panel, inverter and battery sizing workflow on our solar calculator subdomain, then return here for cable voltage-drop planning.
            </p>
            <a href="https://solarcalculator.greenengineeringtools.com" className="mt-4 inline-flex rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-black text-white hover:bg-sky-600">
              Open Solar Calculator ↗
            </a>
          </div>

          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
            <strong>Responsible-use notice:</strong> These results are for engineering planning and education. They do not replace a licensed electrical professional, manufacturer instructions, local electrical codes, the authority having jurisdiction, protection studies, fault-current analysis, or site-specific installation design.
          </div>
        </div>
      </section>
    </main>
  );
}

function Related({ href, title }: { href: string; title: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 font-black text-slate-900 transition hover:border-emerald-300 hover:bg-emerald-50">
      {title} →
    </Link>
  );
}
