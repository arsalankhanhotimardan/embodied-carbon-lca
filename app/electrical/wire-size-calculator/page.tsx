import type { Metadata } from "next";
import ElectricalToolPage from "@/components/electrical/ElectricalToolPage";

export const metadata: Metadata = {
  title: "Wire Size Calculator – AWG, kcmil & mm²",
  description:
    "Free wire size calculator for copper and aluminum conductors. Size AWG, kcmil or mm² cable by voltage-drop target for DC, single-phase and three-phase circuits.",
  alternates: { canonical: "/electrical/wire-size-calculator" },
};

export default function Page() {
  return (
    <ElectricalToolPage
      title="Wire Size Calculator"
      eyebrow="Copper & aluminum conductor planning"
      description="Find the smallest standard AWG, kcmil or metric conductor that satisfies your selected voltage-drop target. The result also shows an approximate cross-system size, receiving voltage, power loss and reverse-solved maximum length."
      canonicalPath="/electrical/wire-size-calculator"
      initialPreset="general"
      initialMode="wire-size"
    >
      <section>
        <h2 className="text-3xl font-black text-slate-950">What this wire size result means</h2>
        <p className="mt-4 leading-7">
          The recommendation is the minimum standard conductor in the selected catalog that satisfies the voltage-drop model at the design current. It is intentionally not presented as a universal code-compliant cable size. Thermal ampacity depends on insulation rating, installation method, ambient temperature, grouping, terminals, local code rules and protection. Those checks cannot be inferred safely from voltage drop alone.
        </p>
      </section>
      <section className="grid gap-5 md:grid-cols-2">
        <Info title="AWG and kcmil">US-style conductor sizes are converted through the standard AWG geometry and circular-mil relationship. The tool reports the actual cross-sectional area used in the resistance calculation.</Info>
        <Info title="Metric mm²">Metric conductor recommendations use common standard cross-sections from 0.5 mm² through large feeder sizes. Parallel runs can be entered when a single conductor is impractical.</Info>
      </section>
      <section>
        <h2 className="text-2xl font-black text-slate-950">Why a larger cable can save energy</h2>
        <p className="mt-3 leading-7">
          Larger conductors have lower resistance. That reduces I²R losses and can lower annual energy waste, especially on long runs with high utilization. The calculator therefore shows annual cable-loss energy and cost alongside the voltage-drop result so a designer can compare first-cost and operating-loss tradeoffs.
        </p>
      </section>
    </ElectricalToolPage>
  );
}
function Info({ title, children }: { title: string; children: React.ReactNode }) { return <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-black text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6">{children}</p></article>; }
