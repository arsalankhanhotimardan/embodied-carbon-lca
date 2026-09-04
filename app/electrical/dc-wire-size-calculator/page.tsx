import type { Metadata } from "next";
import ElectricalToolPage from "@/components/electrical/ElectricalToolPage";

export const metadata: Metadata = {
  title: "DC Wire Size Calculator – 12V, 24V, 48V & Solar",
  description:
    "Free DC wire size calculator for 12V, 24V, 48V, solar, battery, RV and DC systems. Calculate cable size, voltage drop, loss, maximum length and current.",
  alternates: { canonical: "/electrical/dc-wire-size-calculator" },
};

export default function Page() {
  return (
    <ElectricalToolPage
      title="DC Wire Size Calculator"
      eyebrow="Solar • battery • RV • marine • DC distribution"
      description="Size copper or aluminum DC conductors using one-way distance, current or power, source voltage and a chosen voltage-drop target. The engine accounts for both positive and negative conductors and supports AWG, kcmil and metric mm² sizes."
      canonicalPath="/electrical/dc-wire-size-calculator"
      initialPreset="solar-dc"
      initialMode="wire-size"
    >
      <section>
        <h2 className="text-3xl font-black text-slate-950">Why DC cable sizing is sensitive to voltage</h2>
        <p className="mt-4 leading-7">For the same power, a 12 V circuit carries roughly four times the current of a 48 V circuit. Because cable loss increases with current squared, low-voltage battery and inverter circuits can require surprisingly large conductors even when the physical run is short. This is why the calculator shows both voltage drop and I²R power loss.</p>
      </section>
      <section className="grid gap-5 md:grid-cols-3">
        <Info title="Battery systems">Use the battery/inverter preset for short high-current 48 V runs, then replace the example power and length with your actual equipment data.</Info>
        <Info title="Solar DC feeders">For PV strings or DC feeders, enter the real operating current/power and voltage. Final PV wiring must also satisfy product, protection and local solar-code requirements.</Info>
        <Info title="Automotive / RV / marine">The electrical equation still applies, but vibration, insulation, temperature, fusing, flexible-cable construction and environment-specific standards remain separate design checks.</Info>
      </section>
      <section>
        <h2 className="text-2xl font-black text-slate-950">Do not use chassis return unless the system is designed for it</h2>
        <p className="mt-3 leading-7">The calculator assumes a complete two-conductor DC circuit and therefore includes both outgoing and return conductor resistance. If a specialized system uses a different return path, model the actual loop resistance using a manufacturer resistance override or have the circuit reviewed professionally.</p>
      </section>
    </ElectricalToolPage>
  );
}
function Info({ title, children }: { title: string; children: React.ReactNode }) { return <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-black text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6">{children}</p></article>; }
