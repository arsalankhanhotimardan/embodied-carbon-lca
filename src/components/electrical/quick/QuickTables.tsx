import {
  AWG_LIST,
  COPPER_75C_AMPACITY,
  IEC_BREAKER_SIZES,
  NEC_BREAKER_SIZES,
  awgGeometry,
  convertPower,
  hpToKw,
  n,
  type Phase,
} from "@/lib/electrical-quick";
import type { TableSpec } from "@/data/electrical-quick-tools";

const SYSTEMS: { label: string; phase: Phase; voltage: number }[] = [
  { label: "1-phase 120 V", phase: "single", voltage: 120 },
  { label: "1-phase 230 V", phase: "single", voltage: 230 },
  { label: "3-phase 400 V", phase: "three", voltage: 400 },
];

function T({ title, note, head, rows }: { title: string; note?: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <section>
      <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[420px] border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
            <tr>
              {head.map((h, i) => (
                <th key={h} className={`px-3 py-2 ${i === 0 ? "" : "text-right"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-t border-slate-100">
                {row.map((cell, i) => (
                  <td key={i} className={`px-3 py-2 ${i === 0 ? "font-black text-slate-900" : "text-right"}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note ? <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p> : null}
    </section>
  );
}

const APPLIANCES: [string, number, number][] = [
  ["LED bulb", 9, 5],
  ["Ceiling fan", 75, 10],
  ["LED television", 100, 5],
  ["Laptop", 60, 6],
  ["Refrigerator (average draw)", 120, 24],
  ["Desktop computer", 200, 6],
  ["Microwave oven", 1000, 0.5],
  ["Air conditioner (1.5 kW)", 1500, 8],
  ["Electric kettle", 2000, 0.5],
  ["Water heater element", 3000, 2],
];

export default function QuickTables({ spec }: { spec: TableSpec }) {
  switch (spec.kind) {
    case "power-by-amps": {
      const rows = [5, 10, 15, 20, 25, 32, 40, 50, 63, 100, 125, 160].map((a) => {
        const cells: (string | number)[] = [`${a} A`];
        SYSTEMS.forEach((s) => {
          const r = convertPower({ phase: s.phase, voltage: s.voltage, powerFactor: spec.pf, from: "amps", value: a })!;
          cells.push(n(r.kva), n(r.kw));
        });
        return cells;
      });
      return (
        <T
          title="Amps to kVA and kW quick reference"
          note={`kW values use a power factor of ${spec.pf}. kVA does not depend on power factor. Three-phase uses line-to-line voltage.`}
          head={["Current", ...SYSTEMS.flatMap((s) => [`${s.label} kVA`, `kW`])]}
          rows={rows}
        />
      );
    }
    case "amps-by-kw": {
      const rows = [0.5, 1, 2, 3, 5, 7.5, 10, 15, 20, 30, 50, 75, 100].map((kw) => [
        `${kw} kW`,
        ...SYSTEMS.map((s) => n(convertPower({ phase: s.phase, voltage: s.voltage, powerFactor: spec.pf, from: "kw", value: kw })!.amps)),
      ]);
      return <T title="kW to amps quick reference" note={`Current in amps at a power factor of ${spec.pf}. Three-phase uses line-to-line voltage.`} head={["Power", ...SYSTEMS.map((s) => s.label)]} rows={rows} />;
    }
    case "kva-kw-pf": {
      const pfs = [0.6, 0.7, 0.8, 0.9, 0.95, 1];
      const rows = [5, 10, 20, 30, 50, 100, 250, 500, 1000].map((kva) => [`${kva} kVA`, ...pfs.map((pf) => n(kva * pf))]);
      return <T title="kVA to kW at common power factors" note="Real power in kW = kVA × power factor." head={["Apparent", ...pfs.map((p) => `kW @ PF ${p}`)]} rows={rows} />;
    }
    case "hp-kw": {
      const rows = [0.5, 1, 1.5, 2, 3, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 75, 100].map((hp) => [`${hp} HP`, n(hpToKw(hp, "mechanical"), 3), n(hpToKw(hp, "metric"), 3)]);
      return <T title="Horsepower to kilowatts table" note="Shaft output power. Electrical input is higher by the motor's efficiency loss." head={["Horsepower", "kW (mechanical)", "kW (metric)"]} rows={rows} />;
    }
    case "awg": {
      const rows = AWG_LIST.map((g) => {
        const geo = awgGeometry(g);
        const amp = COPPER_75C_AMPACITY[g];
        return [geo.label, n(geo.areaMm2), n(geo.diameterMm), n(geo.kcmil, 2), n(geo.ohmPerKm20C), amp ? `${amp} A` : "—"];
      });
      return (
        <T
          title="AWG to mm² conversion chart"
          note="Resistance is for solid copper at 20 °C. Ampacity is a reference from NEC Table 310.16 (copper, 75 °C column, 30 °C ambient, up to three current-carrying conductors); it is not a design value. Check local code and the overcurrent limits for 14, 12 and 10 AWG."
          head={["AWG", "Area mm²", "Diameter mm", "kcmil", "Ω/km", "Ampacity (ref.)"]}
          rows={rows}
        />
      );
    }
    case "breakers": {
      return (
        <section>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Standard breaker ratings</h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="font-black text-slate-900">US / NEC (240.6(A))</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{NEC_BREAKER_SIZES.join(", ")} A</p>
            </div>
            <div>
              <h3 className="font-black text-slate-900">IEC / metric (common)</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{IEC_BREAKER_SIZES.join(", ")} A</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">A breaker used for a continuous load should not be loaded above 80% of its rating, so for example a 20 A breaker supports 16 A continuous, a 30 A breaker 24 A and a 40 A breaker 32 A.</p>
        </section>
      );
    }
    case "appliances": {
      const rows = APPLIANCES.map(([name, w, h]) => [name, `${w} W`, `${h} h`, n((w * h * 30) / 1000, 1)]);
      return <T title="Typical appliance energy use" note="Illustrative typical values over a 30-day month. Real consumption varies by model and use; measure with a plug-in meter for accuracy." head={["Appliance", "Typical power", "Hours / day", "kWh / month"]} rows={rows} />;
    }
    case "watts-kwh": {
      const rows = [10, 25, 60, 100, 250, 500, 1000, 1500, 2000, 3000].map((w) => [`${w} W`, n(w / 1000, 3), n((w * 8) / 1000, 2), n((w * 24) / 1000, 2), n((w * 24 * 30) / 1000, 1)]);
      return <T title="Watts to kWh table" note="Energy used if the device runs continuously for the stated period." head={["Power", "1 hour", "8 hours", "24 hours", "30 days (24 h/day)"]} rows={rows} />;
    }
    case "pfc": {
      const targets = [0.9, 0.95, 1];
      const tan = (pf: number) => Math.tan(Math.acos(pf));
      const rows = [0.5, 0.6, 0.7, 0.8, 0.85, 0.9].map((p1) => [`PF ${p1}`, ...targets.map((p2) => (p2 > p1 ? n(tan(p1) - tan(p2), 3) : "—"))]);
      return <T title="kvar per kW multiplier table" note="Multiply the load in kW by the value shown to get the capacitor kvar needed to move from the existing to the target power factor." head={["Existing", ...targets.map((t) => `Target ${t}`)]} rows={rows} />;
    }
  }
}
