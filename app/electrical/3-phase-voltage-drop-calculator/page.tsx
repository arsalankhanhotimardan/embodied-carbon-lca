import type { Metadata } from "next";
import ElectricalToolPage from "@/components/electrical/ElectricalToolPage";

export const metadata: Metadata = {
  title: "3 Phase Voltage Drop Calculator",
  description:
    "Free three-phase voltage drop calculator for balanced AC circuits. Enter line-to-line voltage, kW, kVA or amps, power factor, cable length, R/X and conductor size.",
  alternates: { canonical: "/electrical/3-phase-voltage-drop-calculator" },
};

export default function Page() {
  return (
    <ElectricalToolPage
      title="3-Phase Voltage Drop Calculator"
      eyebrow="Balanced three-phase AC circuits"
      description="Calculate current, voltage drop, receiving voltage, cable loss, maximum length and maximum current for balanced three-phase feeders. Enter line-to-line voltage and optionally use manufacturer cable R and X values for higher-fidelity AC calculations."
      canonicalPath="/electrical/3-phase-voltage-drop-calculator"
      initialPreset="motor"
      initialMode="voltage-drop"
    >
      <section>
        <h2 className="text-3xl font-black text-slate-950">Three-phase current and voltage-drop model</h2>
        <p className="mt-4 leading-7">For active power, balanced three-phase current is calculated from P = √3 × V × I × power factor. Voltage drop uses the corresponding √3 impedance relationship. The entered voltage must be the line-to-line system voltage. Unbalanced phase loading, harmonic effects and neutral-current studies require a more detailed network model.</p>
      </section>
      <section className="grid gap-5 md:grid-cols-2">
        <Info title="Resistance and reactance">For AC cables, voltage drop depends on R cosφ + X sinφ. The default planning model can use resistance alone, but long feeders and large conductors should use manufacturer R/X data.</Info>
        <Info title="Motors and starting">The steady-state calculator does not replace a motor-starting study. High inrush current can cause a much larger temporary voltage dip and may govern motor performance even when normal running drop is acceptable.</Info>
      </section>
      <section>
        <h2 className="text-2xl font-black text-slate-950">kW versus kVA input</h2>
        <p className="mt-3 leading-7">Use kW when you know active electrical power and kVA when you know apparent power, such as a generator or transformer rating. When kW is entered, power factor changes the calculated current. When kVA is entered, current comes directly from apparent power, while power factor still affects the AC voltage-drop impedance term.</p>
      </section>
    </ElectricalToolPage>
  );
}
function Info({ title, children }: { title: string; children: React.ReactNode }) { return <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-black text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6">{children}</p></article>; }
