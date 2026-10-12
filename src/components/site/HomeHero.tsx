import { ArrowRight, Check } from "lucide-react";

const MODULES = [
  { label: "A1–A3 Product", pct: 61, bar: "bg-emerald-400" },
  { label: "A4–A5 Construction", pct: 8, bar: "bg-sky-400" },
  { label: "B4 Replacement", pct: 17, bar: "bg-amber-400" },
  { label: "C1–C4 End of life", pct: 14, bar: "bg-violet-400" },
];

/** Landing hero: promise, two clear actions, and a preview of what the tool produces. */
export default function HomeHero() {
  return (
    <section className="hero-dark hero-grid overflow-x-clip text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.12fr_.88fr] lg:items-center lg:gap-14 lg:px-8 lg:py-24">
        <div>
          <p className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">
            Free embodied carbon & whole-building LCA calculator
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
            Embodied Carbon Calculator for{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-300 bg-clip-text text-transparent">Construction Materials</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            Upload CSV or BIM material quantities, reconcile unknown products with EC3 EPD data, calculate lifecycle carbon by module, compare baseline and proposed designs, and report building carbon intensity in kg CO₂e/m².
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#calculator-workspace" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400">
              Open the LCA workspace <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a href="#all-tools" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-black text-white transition hover:bg-white/10">
              Browse 40+ free calculators
            </a>
          </div>

          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-300">
            {["No signup, free to use", "Formulas and sources shown", "Works on phone and desktop"].map((t) => (
              <li key={t} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" strokeWidth={3} aria-hidden="true" /> {t}
              </li>
            ))}
          </ul>

          <ul className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-slate-400">
            {["A1-A3", "A4-A5", "B4 replacements", "C1-C4", "Module D", "EPD data", "EC3 matching", "CSV/BIM"].map((item) => (
              <li key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{item}</li>
            ))}
          </ul>
        </div>

        {/* Illustrative preview of the result view (not real project data). */}
        <div className="relative hidden lg:block" aria-hidden="true">
          <div className="absolute -inset-6 rounded-[2rem] bg-emerald-500/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 text-xs font-bold text-slate-400">LCA results · example office</span>
            </div>
            <div className="p-6">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Carbon intensity</p>
              <p className="mt-1 font-mono text-5xl font-black tracking-tight">
                412 <span className="text-lg font-bold text-emerald-300">kgCO₂e/m²</span>
              </p>
              <div className="mt-6 flex h-3 overflow-hidden rounded-full bg-slate-800">
                {MODULES.map((m) => (
                  <span key={m.label} className={m.bar} style={{ width: `${m.pct}%` }} />
                ))}
              </div>
              <ul className="mt-5 space-y-3">
                {MODULES.map((m) => (
                  <li key={m.label} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2.5 text-slate-300">
                      <span className={`h-2.5 w-2.5 rounded-full ${m.bar}`} /> {m.label}
                    </span>
                    <span className="font-mono font-bold text-white">{m.pct}%</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs">
                <span className="font-bold text-slate-300">Module D shown separately</span>
                <span className="font-black text-emerald-300">Baseline vs proposed</span>
              </div>
              <p className="mt-4 text-[11px] text-slate-500">Illustrative example, not real project data.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
