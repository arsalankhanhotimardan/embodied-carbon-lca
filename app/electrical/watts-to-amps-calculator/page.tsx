import type { Metadata } from "next";
import Link from "next/link";
import PowerConverter from "@/components/electrical/PowerConverter";

export const metadata: Metadata = {
  title: "Watts to Amps Calculator | DC, 1-Phase & 3-Phase",
  description:
    "Convert watts to amps for DC, single-phase AC and balanced three-phase circuits. Includes power-factor formulas, examples and design cautions.",
  alternates: {
    canonical:
      "https://greenengineeringtools.com/electrical/watts-to-amps-calculator",
  },
  openGraph: {
    title: "Watts to Amps Calculator",
    description:
      "Calculate current from active power, voltage, phase type and power factor.",
    url: "https://greenengineeringtools.com/electrical/watts-to-amps-calculator",
    type: "website",
  },
};

const calculatorSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Watts to Amps Calculator",
  url: "https://greenengineeringtools.com/electrical/watts-to-amps-calculator",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web Browser",
  description:
    "A watts-to-amps calculator for DC, single-phase AC and balanced three-phase AC circuits.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorSchema) }}
      />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <Link
            href="/electrical"
            className="text-xs font-black uppercase tracking-wider text-emerald-700 hover:underline"
          >
            ← Electrical tools
          </Link>
          <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
            Watts to Amps Calculator
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Convert active electrical power in watts to current in amps for DC,
            single-phase AC and balanced three-phase AC systems. The AC formulas
            account for power factor, and the three-phase calculation uses line-
            to-line voltage.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold">
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-emerald-800">
              DC and AC modes
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-slate-700">
              Power factor included for AC
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-slate-700">
              No account required
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-950">Calculate current from watts</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Enter the active power, voltage, circuit type and—where applicable—
              power factor. Check the voltage convention before using the result
              in a design calculation.
            </p>
          </div>
          <PowerConverter mode="watts-to-amps" />
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl space-y-12 px-4 py-14 sm:px-6 sm:py-16">
          <section>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Method
            </p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">
              Watts to amps formulas
            </h2>
            <p className="mt-4 leading-8 text-slate-600">
              The correct formula depends on whether the circuit is DC, single-
              phase AC or balanced three-phase AC. In every case, watts represent
              active or real power. Current is higher when AC power factor is lower
              because more current is needed to deliver the same active power.
            </p>

            <div className="mt-7 grid gap-5 md:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-black text-slate-950">DC</h3>
                <p className="mt-3 font-mono text-lg font-bold text-emerald-800">I = P ÷ V</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Divide watts by volts. The result is amps when voltage and power
                  are entered in volts and watts.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-black text-slate-950">Single-phase AC</h3>
                <p className="mt-3 font-mono text-lg font-bold text-emerald-800">
                  I = P ÷ (V × PF)
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Use the circuit voltage and a power factor between 0 and 1.
                  Resistive loads are often close to 1, while inductive or
                  electronic loads may differ.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-black text-slate-950">Balanced three-phase AC</h3>
                <p className="mt-3 font-mono text-lg font-bold text-emerald-800">
                  I = P ÷ (√3 × VLL × PF)
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Use line-to-line voltage, written as VLL, and the power factor
                  of the load.
                </p>
              </article>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-black text-slate-950">Worked examples</h2>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-4">System</th>
                    <th className="p-4">Inputs</th>
                    <th className="p-4">Calculation</th>
                    <th className="p-4">Current</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-4 font-bold">DC</td>
                    <td className="p-4">1,200 W at 120 V</td>
                    <td className="p-4 font-mono">1,200 ÷ 120</td>
                    <td className="p-4 font-mono font-bold">10.00 A</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold">Single-phase AC</td>
                    <td className="p-4">2,000 W, 230 V, PF 0.90</td>
                    <td className="p-4 font-mono">2,000 ÷ (230 × 0.90)</td>
                    <td className="p-4 font-mono font-bold">9.66 A</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold">Three-phase AC</td>
                    <td className="p-4">15,000 W, 400 VLL, PF 0.90</td>
                    <td className="p-4 font-mono">15,000 ÷ (√3 × 400 × 0.90)</td>
                    <td className="p-4 font-mono font-bold">24.06 A</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article>
              <h2 className="text-2xl font-black text-slate-950">How to use this calculator</h2>
              <ol className="mt-4 list-decimal space-y-3 pl-6 leading-8 text-slate-600">
                <li>Choose DC, single-phase AC or balanced three-phase AC.</li>
                <li>Enter active power in watts and the correct voltage.</li>
                <li>For AC, enter a realistic power factor for the load.</li>
                <li>Read the current result in amps and retain the input assumptions.</li>
              </ol>
            </article>
            <article>
              <h2 className="text-2xl font-black text-slate-950">Common mistakes</h2>
              <ul className="mt-4 list-disc space-y-3 pl-6 leading-8 text-slate-600">
                <li>Using line-to-neutral voltage in a formula that requires line-to-line voltage.</li>
                <li>Leaving power factor at 1 when the load has a materially lower factor.</li>
                <li>Confusing active power in watts with apparent power in VA or kVA.</li>
                <li>Treating the calculated current as the final cable or breaker size.</li>
              </ul>
            </article>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-xl font-black text-amber-950">Design and safety limitation</h2>
            <p className="mt-3 text-sm leading-7 text-amber-950">
              This conversion estimates operating current from the entered power
              and voltage. It does not select a conductor, breaker, fuse,
              disconnect, transformer or generator. Final selection may require
              continuous-load rules, starting current, harmonics, ambient
              temperature, installation method, grouping, voltage drop, fault
              current and local electrical code review by a qualified professional.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">Continue with related electrical calculations</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/electrical/kva-to-amps-calculator"
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-800"
              >
                Convert kVA to amps →
              </Link>
              <Link
                href="/electrical/wire-size-calculator"
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800 hover:bg-emerald-100"
              >
                Explore wire-size planning →
              </Link>
              <Link
                href="/electrical/3-phase-voltage-drop-calculator"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 hover:bg-slate-50"
              >
                Check three-phase voltage drop →
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
