import type { Metadata } from "next";
import Link from "next/link";
import PowerConverter from "@/components/electrical/PowerConverter";

export const metadata: Metadata = {
  title: "Watts to Amps Calculator – DC, 1 Phase & 3 Phase",
  description:
    "Convert watts to amps for DC, single-phase AC and balanced three-phase AC circuits using voltage and power factor. Free electrical conversion calculator.",
  alternates: { canonical: "/electrical/watts-to-amps-calculator" },
};

export default function Page() {
  return (
    <main className="bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <Link href="/electrical" className="text-xs font-black text-emerald-700 hover:underline">← Electrical tools</Link>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Watts to Amps Calculator</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">Convert active electrical power to current for DC, single-phase and balanced three-phase circuits. AC calculations include power factor; three-phase input uses line-to-line voltage.</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><PowerConverter mode="watts-to-amps" /></section>
      <section className="border-t border-slate-200 bg-white"><div className="mx-auto max-w-4xl space-y-8 px-4 py-14 sm:px-6 text-slate-600">
        <section><h2 className="text-3xl font-black text-slate-950">Watts to amps formulas</h2><p className="mt-4 leading-7">For DC, current is I = P ÷ V. For single-phase AC, I = P ÷ (V × power factor). For balanced three-phase AC, I = P ÷ (√3 × V × power factor), where V is line-to-line voltage. The calculator treats the entered watts as active electrical power.</p></section>
        <section><h2 className="text-2xl font-black text-slate-950">Why power factor matters</h2><p className="mt-3 leading-7">Two AC loads can consume the same active watts but draw different current if their power factors differ. Lower power factor increases current for the same active power, which can increase voltage drop and conductor losses.</p></section>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"><h2 className="text-xl font-black text-emerald-950">Need to size the cable too?</h2><p className="mt-2 text-sm leading-6 text-emerald-900">Open the full electrical designer to continue from current into conductor size, voltage drop, maximum length and cable power loss.</p><Link href="/electrical/wire-size-calculator" className="mt-4 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white">Open Wire Size Calculator →</Link></div>
      </div></section>
    </main>
  );
}
