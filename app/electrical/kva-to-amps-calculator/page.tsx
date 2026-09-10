import type { Metadata } from "next";
import Link from "next/link";
import PowerConverter from "@/components/electrical/PowerConverter";

export const metadata: Metadata = {
  title: "kVA to Amps Calculator | Single-Phase & 3-Phase",
  description:
    "Convert kVA to amps for single-phase and balanced three-phase systems. Includes formulas, worked examples and generator, transformer and feeder cautions.",
  alternates: {
    canonical:
      "https://greenengineeringtools.com/electrical/kva-to-amps-calculator",
  },
  openGraph: {
    title: "kVA to Amps Calculator",
    description:
      "Calculate current from apparent power for single-phase and three-phase systems.",
    url: "https://greenengineeringtools.com/electrical/kva-to-amps-calculator",
    type: "website",
  },
};

const calculatorSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "kVA to Amps Calculator",
  url: "https://greenengineeringtools.com/electrical/kva-to-amps-calculator",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web Browser",
  description:
    "A kVA-to-amps calculator for single-phase and balanced three-phase AC systems.",
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
            kVA to Amps Calculator
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            Convert apparent power in kVA to current in amps for single-phase and
            balanced three-phase AC systems. This is useful when a generator,
            transformer, UPS or feeder is rated in kVA rather than active watts.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold">
            <span className="rounded-full bg-emerald-50 px-4 py-2 text-emerald-800">
              Single-phase and three-phase
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-slate-700">
              kVA already includes apparent power
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
            <h2 className="text-2xl font-black text-slate-950">Calculate current from kVA</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Enter the apparent power, circuit type and voltage. For a balanced
              three-phase calculation, use line-to-line voltage as required by the
              formula.
            </p>
          </div>
          <PowerConverter mode="kva-to-amps" />
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl space-y-12 px-4 py-14 sm:px-6 sm:py-16">
          <section>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Method
            </p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">kVA to amps formulas</h2>
            <p className="mt-4 leading-8 text-slate-600">
              Apparent power is the product of voltage and current in an AC
              system, expressed here in kilovolt-amperes. Because kVA already
              represents apparent power, power factor is not needed to calculate
              current from kVA. Power factor is still useful when estimating the
              corresponding active power in kW.
            </p>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-black text-slate-950">Single-phase AC</h3>
                <p className="mt-3 font-mono text-lg font-bold text-emerald-800">
                  I = kVA × 1,000 ÷ V
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Enter kVA and the applicable single-phase voltage. The result is
                  current in amps.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-lg font-black text-slate-950">Balanced three-phase AC</h3>
                <p className="mt-3 font-mono text-lg font-bold text-emerald-800">
                  I = kVA × 1,000 ÷ (√3 × VLL)
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Use line-to-line voltage, written as VLL, for the balanced
                  three-phase formula.
                </p>
              </article>
            </div>

            <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
              <h3 className="text-lg font-black text-indigo-950">Relationship between kVA, kW and power factor</h3>
              <p className="mt-3 text-sm leading-7 text-indigo-950">
                Active power can be estimated as <strong>kW = kVA × power factor</strong>.
                For example, a 100 kVA load operating at a 0.80 power factor is
                approximately 80 kW. The current from the kVA rating remains based
                on apparent power and voltage.
              </p>
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
                    <td className="p-4 font-bold">Single-phase</td>
                    <td className="p-4">10 kVA at 230 V</td>
                    <td className="p-4 font-mono">10 × 1,000 ÷ 230</td>
                    <td className="p-4 font-mono font-bold">43.48 A</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold">Three-phase</td>
                    <td className="p-4">100 kVA at 400 VLL</td>
                    <td className="p-4 font-mono">100 × 1,000 ÷ (√3 × 400)</td>
                    <td className="p-4 font-mono font-bold">144.34 A</td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold">Three-phase</td>
                    <td className="p-4">500 kVA at 415 VLL</td>
                    <td className="p-4 font-mono">500 × 1,000 ÷ (√3 × 415)</td>
                    <td className="p-4 font-mono font-bold">695.60 A</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <article>
              <h2 className="text-2xl font-black text-slate-950">Where the result helps</h2>
              <ul className="mt-4 list-disc space-y-3 pl-6 leading-8 text-slate-600">
                <li>Checking the approximate full-load current of a generator or transformer.</li>
                <li>Comparing a nameplate rating with a feeder or switchboard rating.</li>
                <li>Preparing inputs for a voltage-drop or conductor-sizing review.</li>
                <li>Converting apparent-power information into a consistent current value.</li>
              </ul>
            </article>
            <article>
              <h2 className="text-2xl font-black text-slate-950">Voltage conventions</h2>
              <p className="mt-4 leading-8 text-slate-600">
                Use the voltage that matches the system and the calculator mode.
                For the three-phase equation above, VLL means line-to-line voltage.
                Mixing line-to-neutral and line-to-line values can produce a
                materially incorrect current.
              </p>
            </article>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-xl font-black text-amber-950">Generator, transformer and feeder caution</h2>
            <p className="mt-3 text-sm leading-7 text-amber-950">
              kVA-to-amps conversion does not complete equipment selection. Final
              design may need motor-starting current, transformer impedance,
              harmonics, neutral loading, load diversity, continuous-load rules,
              overload capability, ambient conditions, conductor installation
              method, voltage drop, short-circuit current and local code review.
              Ask a qualified electrical professional to verify a safety-critical
              design.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-slate-950">Continue with related electrical calculations</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/electrical/watts-to-amps-calculator"
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-800"
              >
                Convert watts to amps →
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
