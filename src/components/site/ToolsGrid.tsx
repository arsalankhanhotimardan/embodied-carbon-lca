import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { CATEGORIES } from "./categories";

const POPULAR = [
  { label: "kW to amps", href: "/electrical/kw-to-amps-calculator" },
  { label: "Voltage drop", href: "/electrical/voltage-drop-calculator" },
  { label: "Wire size", href: "/electrical/wire-size-calculator" },
  { label: "U-value", href: "/building-envelope/u-value-calculator" },
  { label: "R-value", href: "/building-envelope/r-value-calculator" },
  { label: "CBAM cost", href: "/cbam-calculator" },
  { label: "CBAM certificate price", href: "/cbam/certificate-price" },
  { label: "House carbon footprint", href: "/house-carbon-footprint-calculator" },
];

/** "All tools" section that makes the whole platform visible on the landing page. */
export default function ToolsGrid() {
  return (
    <section id="all-tools" className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">All tools</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Free calculators for engineers, designers and homeowners</h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">Pick a tool family. Every calculator is free, runs in your browser and shows the formulas behind the result.</p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <article key={c.id} className={`card-lift flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 ${c.hoverBorder}`}>
                <div className="flex items-center gap-3">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ring-1 ${c.tint} ${c.ring}`}>
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-black leading-snug text-slate-950">{c.name}</h3>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{c.blurb}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      {c.external ? (
                        <a href={l.href} className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-white">{l.label}</a>
                      ) : (
                        <Link href={l.href} className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-white">{l.label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-6">
                  {c.external ? (
                    <a href={c.href} className={`inline-flex items-center gap-1.5 text-sm font-black ${c.accentText}`}>
                      Open solar site <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ) : (
                    <Link href={c.href} className={`inline-flex items-center gap-1.5 text-sm font-black ${c.accentText}`}>
                      {c.id === "lca" ? "Open the workspace" : "Explore"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Popular right now</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {POPULAR.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="inline-block rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700">{p.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
