import type { Metadata } from "next";
import ElectricalToolPage from "@/components/electrical/ElectricalToolPage";

export const metadata: Metadata = {
  title: "Cable Power Loss Calculator – I²R Energy Loss",
  description:
    "Calculate electrical cable power loss in watts, annual kWh wasted and annual energy cost for DC, single-phase and three-phase circuits using copper or aluminum.",
  alternates: { canonical: "/electrical/cable-power-loss-calculator" },
};

export default function Page() {
  return (
    <ElectricalToolPage
      title="Cable Power Loss Calculator"
      eyebrow="I²R loss • annual kWh • annual cost"
      description="Estimate real resistive cable loss in watts, annual energy wasted and annual electricity cost. Compare conductor size, material, temperature, circuit current and parallel runs to understand the operating-energy consequence of cable resistance."
      canonicalPath="/electrical/cable-power-loss-calculator"
      initialPreset="general"
      initialMode="power-loss"
    >
      <section>
        <h2 className="text-3xl font-black text-slate-950">Why cable loss rises so quickly with current</h2>
        <p className="mt-4 leading-7">Real conductor loss follows I²R. Doubling current increases resistive loss by roughly four times if resistance stays the same. That is why high-current low-voltage systems and long heavily loaded feeders can waste substantial energy even when the percentage voltage drop appears manageable.</p>
      </section>
      <section className="grid gap-5 md:grid-cols-2">
        <Info title="Annual energy loss">The calculator multiplies operating cable loss by your entered hours per day and 365 days. Adjust operating hours to match the duty cycle instead of assuming the circuit runs continuously.</Info>
        <Info title="Annual cost">Enter your local electricity tariff and currency code. The cost estimate is simply annual lost kWh × tariff; it does not forecast future tariffs or demand charges.</Info>
      </section>
      <section>
        <h2 className="text-2xl font-black text-slate-950">Economic upsizing</h2>
        <p className="mt-3 leading-7">A conductor larger than the minimum voltage-drop requirement can sometimes pay back through reduced energy loss on high-utilization circuits. A full economic study should compare installed cable cost, energy price, operating hours, project life and discount rate, but the annual loss result gives a useful first screening metric.</p>
      </section>
    </ElectricalToolPage>
  );
}
function Info({ title, children }: { title: string; children: React.ReactNode }) { return <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-black text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6">{children}</p></article>; }
