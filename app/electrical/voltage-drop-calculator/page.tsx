import type { Metadata } from "next";
import ElectricalToolPage from "@/components/electrical/ElectricalToolPage";

export const metadata: Metadata = {
  title: "Voltage Drop Calculator – DC, Single & 3 Phase",
  description:
    "Free voltage drop calculator for DC, single-phase and three-phase circuits. Calculate volts lost, percentage drop, receiving voltage, cable loss, max length and current.",
  alternates: { canonical: "/electrical/voltage-drop-calculator" },
};

export default function Page() {
  return (
    <ElectricalToolPage
      title="Voltage Drop Calculator"
      eyebrow="DC • single-phase • three-phase"
      description="Calculate voltage drop in volts and percent, receiving-end voltage, conductor resistance, cable power loss, maximum circuit length and maximum current. Use mm², AWG or kcmil conductors and enter manufacturer resistance/reactance when available."
      canonicalPath="/electrical/voltage-drop-calculator"
      initialPreset="general"
      initialMode="voltage-drop"
    >
      <section>
        <h2 className="text-3xl font-black text-slate-950">How voltage drop is calculated</h2>
        <p className="mt-4 leading-7">
          Voltage drop depends on current, cable length, conductor impedance and circuit configuration. DC and single-phase circuits include the outgoing and return path. Balanced three-phase circuits use the √3 relationship. For AC, the engine can include both resistance and reactance with the entered power factor; if cable reactance is unknown, the result is clearly labelled as a resistance-only planning calculation.
        </p>
      </section>
      <section className="grid gap-5 md:grid-cols-3">
        <Info title="One-way length">Enter the physical source-to-load distance. Do not double the cable length yourself; the engine applies the circuit path factor.</Info>
        <Info title="Temperature-aware R">Generic copper or aluminum resistance is adjusted from 20 °C to the entered conductor temperature unless a manufacturer Ω/km value is supplied.</Info>
        <Info title="Reverse solving">The same result also reports the maximum cable length and maximum current that would meet the selected voltage-drop target.</Info>
      </section>
      <section>
        <h2 className="text-2xl font-black text-slate-950">Is 3% voltage drop always required?</h2>
        <p className="mt-3 leading-7">
          No universal percentage applies to every country and circuit. A 3% branch-circuit target and 5% combined feeder/branch recommendation are commonly referenced in NEC contexts, but they are informational design guidance rather than a worldwide rule. Use the target required by your local code, project specification, equipment manufacturer or authority having jurisdiction.
        </p>
      </section>
    </ElectricalToolPage>
  );
}

function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-black text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6">{children}</p></article>;
}
