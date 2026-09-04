import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Free Electrical Engineering Calculators",
  description:
    "Free electrical calculators for voltage drop, wire size, cable length, DC cables, three-phase circuits, watts to amps, kVA to amps and cable power loss.",
  alternates: { canonical: "/electrical" },
  openGraph: {
    title: "Free Electrical Engineering Calculators | Green Engineering Tools",
    description:
      "Voltage drop, wire size, DC cable, three-phase, current conversion and cable-loss tools with transparent engineering assumptions.",
    url: "https://greenengineeringtools.com/electrical",
    type: "website",
  },
};

const tools = [
  {
    href: "/electrical/voltage-drop-calculator",
    title: "Voltage Drop Calculator",
    description: "Calculate volts lost, percentage drop, receiving voltage, cable resistance and real power loss.",
  },
  {
    href: "/electrical/wire-size-calculator",
    title: "Wire Size Calculator",
    description: "Find the smallest standard AWG, kcmil or mm² conductor that meets your chosen voltage-drop target.",
  },
  {
    href: "/electrical/wire-length-calculator",
    title: "Wire Length Calculator",
    description: "Reverse-solve the maximum one-way cable run for a conductor, load and allowed voltage drop.",
  },
  {
    href: "/electrical/dc-wire-size-calculator",
    title: "DC Wire Size Calculator",
    description: "Size low-voltage or high-voltage DC conductors for batteries, solar, controls, RV, marine and DC distribution.",
  },
  {
    href: "/electrical/3-phase-voltage-drop-calculator",
    title: "3-Phase Voltage Drop Calculator",
    description: "Balanced three-phase current and voltage-drop calculations using line-to-line voltage and power factor.",
  },
  {
    href: "/electrical/battery-cable-size-calculator",
    title: "Battery Cable Size Calculator",
    description: "Plan short high-current battery and inverter DC cable runs with tight voltage-drop targets.",
  },
  {
    href: "/electrical/cable-power-loss-calculator",
    title: "Cable Power Loss Calculator",
    description: "Estimate I²R cable loss in watts, annual energy wasted and annual electricity cost.",
  },
  {
    href: "/electrical/watts-to-amps-calculator",
    title: "Watts to Amps Calculator",
    description: "Convert active power to current for DC, single-phase AC and balanced three-phase AC circuits.",
  },
  {
    href: "/electrical/kva-to-amps-calculator",
    title: "kVA to Amps Calculator",
    description: "Convert apparent power to current for generators, transformers, UPS systems and three-phase feeders.",
  },
];

export default function ElectricalHubPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Electrical Engineering Calculators",
    url: "https://greenengineeringtools.com/electrical",
    description:
      "Free electrical engineering calculators for voltage drop, conductor size, current conversion and cable power loss.",
    isPartOf: {
      "@type": "WebSite",
      name: "Green Engineering Tools",
      url: "https://greenengineeringtools.com",
    },
  };

  return (
    <main className="bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Electrical engineering workspace</p>
          <h1 className="mt-4 max-w-5xl text-4xl font-black tracking-tight sm:text-6xl">
            Free electrical calculators for cable, voltage drop & power systems
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            Solve practical DC, single-phase and balanced three-phase calculations without an account. Work in AWG, kcmil or mm², reverse-solve cable length and current, estimate I²R losses and keep the engineering assumptions visible.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/electrical/voltage-drop-calculator" className="rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950 hover:bg-emerald-400">
              Open flagship designer
            </Link>
            <Link href="/electrical/methodology" className="rounded-xl border border-slate-700 px-5 py-3 font-black text-white hover:bg-slate-900">
              Read methodology
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link key={tool.href} href={tool.href} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg">
              <h2 className="text-xl font-black text-slate-950 group-hover:text-emerald-700">{tool.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{tool.description}</p>
              <span className="mt-5 inline-flex text-sm font-black text-emerald-700">Open calculator →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <article>
            <h2 className="text-3xl font-black text-slate-950">Why one shared electrical engine?</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Voltage drop, conductor size, maximum cable length, maximum current and cable loss are different views of the same circuit. Green Engineering Tools uses one shared calculation engine so the pages do not quietly disagree with each other. The same conductor resistance, temperature, power-factor and parallel-run assumptions follow the calculation wherever you start.
            </p>
            <p className="mt-4 leading-7 text-slate-600">
              The tool deliberately separates voltage-drop sizing from thermal ampacity. A cable can meet a 3% voltage-drop target and still be unsafe if its installation ampacity, grouping, ambient correction, short-circuit withstand or protection is unsuitable. That boundary is shown instead of hidden.
            </p>
          </article>
          <article className="rounded-2xl bg-slate-950 p-7 text-white">
            <h2 className="text-2xl font-black">Designed for real-world workflows</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
              <li>• Home and commercial branch-circuit planning</li>
              <li>• Solar DC feeders and battery/inverter cables</li>
              <li>• EV charger circuit voltage-drop studies</li>
              <li>• Motors and balanced three-phase feeders</li>
              <li>• Generator and UPS feeder current conversion</li>
              <li>• Energy-efficiency studies using annual cable loss</li>
            </ul>
            <a href="https://solarcalculator.greenengineeringtools.com" className="mt-6 inline-flex rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white hover:bg-sky-500">
              Open Solar Calculator ↗
            </a>
          </article>
        </div>
      </section>
    </main>
  );
}
