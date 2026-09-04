import type { Metadata } from "next";
import Link from "next/link";
import PowerConverter from "@/components/electrical/PowerConverter";

export const metadata: Metadata = {
  title: "kVA to Amps Calculator – Single & 3 Phase",
  description:
    "Convert kVA to amps for single-phase and balanced three-phase systems. Useful for generators, transformers, UPS systems and electrical feeders.",
  alternates: { canonical: "/electrical/kva-to-amps-calculator" },
};

export default function Page() {
  return (
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"><Link href="/electrical" className="text-xs font-black text-emerald-700 hover:underline">← Electrical tools</Link><h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">kVA to Amps Calculator</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Convert apparent power in kVA to current for single-phase or balanced three-phase systems. Useful for generator, transformer and UPS nameplate ratings where apparent power is known directly.</p></div></section>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><PowerConverter mode="kva-to-amps" /></section>
      <section className="border-t border-slate-200 bg-white"><div className="mx-auto max-w-4xl space-y-8 px-4 py-14 sm:px-6 text-slate-600">
        <section><h2 className="text-3xl font-black text-slate-950">kVA to amps formulas</h2><p className="mt-4 leading-7">For single-phase AC, I = kVA × 1000 ÷ V. For balanced three-phase AC, I = kVA × 1000 ÷ (√3 × V), using line-to-line voltage. Power factor is not needed to calculate current from kVA because apparent power already includes the relationship between volts and amps; the calculator still uses power factor to show corresponding active kW.</p></section>
        <section><h2 className="text-2xl font-black text-slate-950">Generator and transformer sizing caution</h2><p className="mt-3 leading-7">Converting kVA to current does not size a generator, transformer, breaker or cable by itself. Motor starting, harmonics, nonlinear loads, duty cycle, overload capability, ambient conditions and local protection rules can materially change equipment selection.</p></section>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><h2 className="text-xl font-black text-emerald-950">Continue into feeder design</h2><p className="mt-2 text-sm leading-6 text-emerald-900">Use the three-phase voltage drop tool to evaluate a generator or transformer feeder after converting the kVA rating to current.</p><Link href="/electrical/3-phase-voltage-drop-calculator" className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white">Open 3-Phase Calculator →</Link></div>
      </div></section>
    </main>
  );
}
