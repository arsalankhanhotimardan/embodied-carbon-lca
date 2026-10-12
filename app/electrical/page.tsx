import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Battery, BatteryCharging, Cable, Calculator, Flame, Gauge, Network, Ruler, Zap, type LucideIcon } from "lucide-react";
import HubHero from "@/components/site/HubHero";
import ToolLinkCard from "@/components/site/ToolLinkCard";
import { QUICK_TOOLS } from "@/data/electrical-quick-tools";

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

const ICONS: Record<string, LucideIcon> = {
  "/electrical/voltage-drop-calculator": Activity,
  "/electrical/wire-size-calculator": Cable,
  "/electrical/wire-length-calculator": Ruler,
  "/electrical/dc-wire-size-calculator": BatteryCharging,
  "/electrical/3-phase-voltage-drop-calculator": Network,
  "/electrical/battery-cable-size-calculator": Battery,
  "/electrical/cable-power-loss-calculator": Flame,
  "/electrical/watts-to-amps-calculator": Zap,
  "/electrical/kva-to-amps-calculator": Gauge,
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
      <HubHero
        icon={Zap}
        eyebrow="Electrical engineering workspace"
        title="Free electrical calculators for cable, voltage drop & power systems"
        intro="Solve practical DC, single-phase and balanced three-phase calculations without an account. Work in AWG, kcmil or mm², reverse-solve cable length and current, estimate I²R losses and keep the engineering assumptions visible."
        ctas={[
          { label: "Open flagship designer", href: "/electrical/voltage-drop-calculator", primary: true },
          { label: "Quick converters", href: "/electrical#converters" },
          { label: "Read methodology", href: "/electrical/methodology" },
        ]}
        chips={["AWG · kcmil · mm²", "DC · 1-phase · 3-phase", "Reverse solving", "Cable loss and cost"]}
      />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Cable and circuit designers</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <ToolLinkCard key={tool.href} href={tool.href} title={tool.title} description={tool.description} icon={ICONS[tool.href] ?? Calculator} tint="bg-blue-50 text-blue-700" hoverBorder="hover:border-blue-300" accentText="text-blue-700" />
          ))}
        </div>
      </section>

      <section id="converters" className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-black text-slate-950">Quick converters and reference tools</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Single-purpose calculators for everyday conversions: amps, watts, kW, kVA, horsepower, breaker size, wire gauge, running cost and power factor.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_TOOLS.map((tool) => (
            <ToolLinkCard key={tool.slug} href={`/electrical/${tool.slug}`} title={tool.title} description={tool.eyebrow} icon={Calculator} tint="bg-slate-100 text-slate-700" hoverBorder="hover:border-blue-300" accentText="text-blue-700" />
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
