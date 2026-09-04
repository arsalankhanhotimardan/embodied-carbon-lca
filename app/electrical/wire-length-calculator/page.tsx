import type { Metadata } from "next";
import ElectricalToolPage from "@/components/electrical/ElectricalToolPage";

export const metadata: Metadata = {
  title: "Wire Length Calculator – Maximum Cable Run",
  description:
    "Calculate maximum wire or cable length for a selected conductor, load, voltage and voltage-drop limit. Supports DC, single-phase, three-phase, AWG and mm².",
  alternates: { canonical: "/electrical/wire-length-calculator" },
};

export default function Page() {
  return (
    <ElectricalToolPage
      title="Wire Length Calculator"
      eyebrow="Reverse voltage-drop calculation"
      description="Find the maximum one-way cable run that keeps a selected conductor within your chosen voltage-drop limit. Useful for remote loads, pumps, EV chargers, outbuildings, solar equipment and long commercial feeders."
      canonicalPath="/electrical/wire-length-calculator"
      initialPreset="general"
      initialMode="max-length"
    >
      <section>
        <h2 className="text-3xl font-black text-slate-950">Maximum cable length from a voltage-drop limit</h2>
        <p className="mt-4 leading-7">
          Instead of starting with a cable length and asking how much voltage is lost, this mode rearranges the same impedance equation to solve the longest one-way run allowed at the selected percentage drop. The answer changes immediately with current, source voltage, conductor material, conductor temperature, parallel runs and AC power factor/reactance.
        </p>
      </section>
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h3 className="text-xl font-black text-emerald-950">A useful design comparison</h3>
        <p className="mt-2 text-sm leading-6 text-emerald-900">Try the same load at 120 V, 230 V and 400 V, or compare copper with aluminum. Higher distribution voltage generally lowers current for the same power and can greatly increase the distance available before a voltage-drop target is reached.</p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-slate-950">Length is not the only cable-sizing constraint</h2>
        <p className="mt-3 leading-7">A run that passes a voltage-drop limit still needs a separate thermal ampacity, protection, installation and fault-current review. For underground, grouped, high-temperature or mechanically demanding installations, those constraints may govern before voltage drop does.</p>
      </section>
    </ElectricalToolPage>
  );
}
