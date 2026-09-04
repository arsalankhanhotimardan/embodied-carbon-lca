import type { Metadata } from "next";
import ElectricalToolPage from "@/components/electrical/ElectricalToolPage";

export const metadata: Metadata = {
  title: "Battery Cable Size Calculator – Inverter DC Cables",
  description:
    "Battery cable size calculator for 12V, 24V, 48V and inverter systems. Estimate DC current, cable size, voltage drop and I²R loss for short high-current runs.",
  alternates: { canonical: "/electrical/battery-cable-size-calculator" },
};

export default function Page() {
  return (
    <ElectricalToolPage
      title="Battery Cable Size Calculator"
      eyebrow="High-current DC battery & inverter cables"
      description="Plan battery-to-inverter and other low-voltage DC cable runs using actual power, voltage and one-way distance. Tight voltage-drop targets matter because low system voltage can produce very high current and large resistive losses."
      canonicalPath="/electrical/battery-cable-size-calculator"
      initialPreset="battery"
      initialMode="wire-size"
    >
      <section>
        <h2 className="text-3xl font-black text-slate-950">Battery cables are often governed by current, not distance</h2>
        <p className="mt-4 leading-7">A 5 kW load at 48 V is already above 100 A before inverter losses are considered; at 12 V the current would be several times higher. Even a two-metre cable run can therefore have meaningful voltage drop and heat loss. Enter the electrical power actually carried by the DC cable, not the AC appliance nameplate unless you have accounted for conversion efficiency.</p>
      </section>
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h3 className="text-xl font-black text-red-950">Protection and fault current are critical</h3>
        <p className="mt-2 text-sm leading-6 text-red-900">Battery systems can supply extremely high short-circuit current. Cable size is only one part of the design. Correct fuse/breaker DC ratings, interrupting capacity, cable insulation, terminals, lugs, polarity, battery manufacturer limits and short-circuit protection must be engineered separately.</p>
      </section>
      <section>
        <h2 className="text-2xl font-black text-slate-950">Use manufacturer cable resistance when possible</h2>
        <p className="mt-3 leading-7">Flexible battery cable can differ from an ideal solid conductor because of strand construction, conductor material and temperature. The advanced resistance override lets you enter the manufacturer’s measured Ω/km value instead of relying on the generic material model.</p>
      </section>
    </ElectricalToolPage>
  );
}
