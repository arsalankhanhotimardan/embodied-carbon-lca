"use client";

import { useMemo, useState } from "react";
import {
  AWG_LIST,
  COPPER_75C_AMPACITY,
  HP_TYPES,
  awgForArea,
  awgGeometry,
  awgLabel,
  convertPower,
  energyCost,
  hpToKw,
  kwToHp,
  n,
  nearestMetricSize,
  powerFactorCorrection,
  powerFormulaText,
  sizeBreaker,
  solveOhm,
  type BreakerStandard,
  type HpType,
  type Phase,
  type PowerQuantity,
} from "@/lib/electrical-quick";

export type QuickToolConfig =
  | { kind: "power"; from: PowerQuantity; to: PowerQuantity; value: number; voltage?: number; phase?: Phase; powerFactor?: number }
  | { kind: "ohm" }
  | { kind: "breaker" }
  | { kind: "awg"; direction?: "awg-to-mm2" | "mm2-to-awg" }
  | { kind: "hp"; direction: "kw-to-hp" | "hp-to-kw" }
  | { kind: "cost"; unit?: "watts" | "kwh" }
  | { kind: "pfc" };

const inputCls =
  "w-full min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200";

const num = (s: string) => (s.trim() === "" ? NaN : Number(s));

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-slate-600">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

function NumberInput({ value, onChange, min, step = "any", placeholder }: { value: string; onChange: (v: string) => void; min?: number; step?: string; placeholder?: string }) {
  return <input type="number" inputMode="decimal" min={min} step={step} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
}

function Shell({ inputs, result }: { inputs: React.ReactNode; result: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-2">
        <div className="space-y-4">{inputs}</div>
        <div className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6" role="status" aria-live="polite">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Result</p>
          {result}
        </div>
      </div>
    </div>
  );
}

function Primary({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-words font-mono text-3xl font-black sm:text-4xl">
        {value} <span className="text-xl text-emerald-300">{unit}</span>
      </p>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 break-words font-mono text-sm font-black">
        {value} {unit}
      </p>
    </div>
  );
}

function Steps({ text }: { text: string }) {
  return <p className="mt-4 break-words rounded-xl bg-slate-900/70 p-3 font-mono text-xs leading-5 text-slate-300">{text}</p>;
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // Clipboard can be blocked; ignore.
        }
      }}
      className="mt-4 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-black text-slate-200 hover:bg-slate-800"
    >
      {done ? "Copied ✓" : "Copy result"}
    </button>
  );
}

const Empty = ({ text = "Enter valid positive numbers to see the result." }: { text?: string }) => <p className="mt-4 text-sm text-slate-400">{text}</p>;

// ---------------------------------------------------------------- Power

const QTY: Record<PowerQuantity, { label: string; unit: string }> = {
  amps: { label: "Current", unit: "A" },
  watts: { label: "Real power", unit: "W" },
  kw: { label: "Real power", unit: "kW" },
  va: { label: "Apparent power", unit: "VA" },
  kva: { label: "Apparent power", unit: "kVA" },
};
const REAL = new Set<PowerQuantity>(["watts", "kw"]);

function PowerTool({ cfg }: { cfg: Extract<QuickToolConfig, { kind: "power" }> }) {
  const [from, setFrom] = useState<PowerQuantity>(cfg.from);
  const [to, setTo] = useState<PowerQuantity>(cfg.to);
  const [value, setValue] = useState(String(cfg.value));
  const [phase, setPhase] = useState<Phase>(cfg.phase ?? "single");
  const [voltage, setVoltage] = useState(String(cfg.voltage ?? 230));
  const [pf, setPf] = useState(String(cfg.powerFactor ?? 0.9));

  const needsVoltage = from === "amps" || to === "amps";
  const pfRelevant = REAL.has(from) !== REAL.has(to);
  const needsPf = pfRelevant && (needsVoltage ? phase !== "dc" : true);
  const effPhase: Phase = needsVoltage ? phase : "single";
  const effVoltage = needsVoltage ? num(voltage) : 230;
  const effPf = pfRelevant ? num(pf) : 1;
  const showAmps = needsVoltage;
  const showReal = pfRelevant || (REAL.has(from) && REAL.has(to));
  const showApparent = pfRelevant || (!REAL.has(from) && !REAL.has(to));

  const result = useMemo(
    () => convertPower({ phase: effPhase, voltage: effVoltage, powerFactor: effPhase === "dc" ? 1 : effPf, from, value: num(value) }),
    [effPhase, effVoltage, effPf, from, value]
  );
  const input = { phase: effPhase, voltage: effVoltage, powerFactor: effPf, from, to, value: num(value) };
  const steps = result ? powerFormulaText(input, result) : "";
  const primary = result ? result[to === "amps" ? "amps" : to] : 0;
  const summary = result ? `${n(num(value))} ${QTY[from].unit} = ${n(primary)} ${QTY[to].unit}${needsVoltage ? ` (${n(effVoltage)} V, ${effPhase === "three" ? "3-phase" : effPhase === "dc" ? "DC" : "1-phase"}${needsPf && effPhase !== "dc" ? `, PF ${n(effPf)}` : ""})` : ""}` : "";

  const select = (v: PowerQuantity, set: (q: PowerQuantity) => void, label: string) => (
    <Field label={label}>
      <select value={v} onChange={(e) => set(e.target.value as PowerQuantity)} className={inputCls}>
        {(Object.keys(QTY) as PowerQuantity[]).map((q) => (
          <option key={q} value={q}>{`${QTY[q].label} (${QTY[q].unit})`}</option>
        ))}
      </select>
    </Field>
  );

  return (
    <Shell
      inputs={
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {select(from, setFrom, "Convert from")}
            {select(to, setTo, "Convert to")}
          </div>
          <Field label={`Value (${QTY[from].unit})`}>
            <NumberInput value={value} onChange={setValue} min={0} />
          </Field>
          {needsVoltage ? (
            <>
              <Field label="Circuit type">
                <select value={phase} onChange={(e) => setPhase(e.target.value as Phase)} className={inputCls}>
                  <option value="single">Single-phase AC</option>
                  <option value="three">Three-phase AC</option>
                  <option value="dc">DC</option>
                </select>
              </Field>
              <Field label={phase === "three" ? "Line-to-line voltage (V)" : "Voltage (V)"}>
                <NumberInput value={voltage} onChange={setVoltage} min={1} />
              </Field>
            </>
          ) : null}
          {needsPf ? (
            <Field label="Power factor" hint="Typical: 0.8 motors, 0.9 mixed loads, 1.0 resistive heaters">
              <NumberInput value={pf} onChange={setPf} min={0.01} step="0.01" />
            </Field>
          ) : null}
        </>
      }
      result={
        result ? (
          <>
            <Primary label={`${QTY[to].label}`} value={n(primary)} unit={QTY[to].unit} />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {showAmps ? <Stat label="Current" value={n(result.amps)} unit="A" /> : null}
              {showReal ? <Stat label="Real power" value={n(result.kw)} unit="kW" /> : null}
              {showApparent ? <Stat label="Apparent power" value={n(result.kva)} unit="kVA" /> : null}
            </div>
            <Steps text={steps} />
            <CopyButton text={summary} />
          </>
        ) : (
          <Empty text="Enter a positive value, voltage and a power factor between 0 and 1." />
        )
      }
    />
  );
}

// ------------------------------------------------------------------ Ohm

type OhmKey = "voltage" | "current" | "resistance" | "power";
const OHM_FIELDS: { key: OhmKey; label: string; unit: string }[] = [
  { key: "voltage", label: "Voltage", unit: "V" },
  { key: "current", label: "Current", unit: "A" },
  { key: "resistance", label: "Resistance", unit: "Ω" },
  { key: "power", label: "Power", unit: "W" },
];

function OhmTool() {
  const [vals, setVals] = useState<Record<OhmKey, string>>({ voltage: "12", current: "", resistance: "6", power: "" });
  const [order, setOrder] = useState<OhmKey[]>(["voltage", "resistance"]);

  const edit = (key: OhmKey, v: string) => {
    setVals((p) => ({ ...p, [key]: v }));
    setOrder((p) => (num(v) > 0 ? [...p.filter((k) => k !== key), key] : p.filter((k) => k !== key)));
  };
  const used = order.filter((k) => num(vals[k]) > 0).slice(-2);
  const result = useMemo(() => {
    if (used.length < 2) return null;
    const input: Record<string, number> = {};
    used.forEach((k) => (input[k] = num(vals[k])));
    return solveOhm(input);
  }, [used, vals]);

  return (
    <Shell
      inputs={
        <>
          <p className="text-sm text-slate-600">Fill in any two values. If you fill more, the two you edited most recently are used.</p>
          {OHM_FIELDS.map((f) => (
            <Field key={f.key} label={`${f.label} (${f.unit})`}>
              <NumberInput value={vals[f.key]} onChange={(v) => edit(f.key, v)} min={0} />
            </Field>
          ))}
          <button type="button" onClick={() => { setVals({ voltage: "", current: "", resistance: "", power: "" }); setOrder([]); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50">
            Clear all
          </button>
        </>
      }
      result={
        result ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {OHM_FIELDS.map((f) => (
                <div key={f.key} className={`rounded-xl border p-4 ${used.includes(f.key) ? "border-slate-700 bg-slate-900" : "border-emerald-500/40 bg-emerald-500/10"}`}>
                  <p className="text-xs font-bold text-slate-400">{f.label}{used.includes(f.key) ? " (input)" : ""}</p>
                  <p className="mt-1 break-words font-mono text-xl font-black">{n(result[f.key])} {f.unit}</p>
                </div>
              ))}
            </div>
            <Steps text={`V = I × R, P = V × I, P = I² × R = V² ÷ R`} />
            <CopyButton text={`V=${n(result.voltage)} V, I=${n(result.current)} A, R=${n(result.resistance)} Ω, P=${n(result.power)} W`} />
          </>
        ) : (
          <Empty text="Enter any two positive values to solve for the other two." />
        )
      }
    />
  );
}

// -------------------------------------------------------------- Breaker

function BreakerTool() {
  const [mode, setMode] = useState<"amps" | "watts">("amps");
  const [amps, setAmps] = useState("24");
  const [watts, setWatts] = useState("5000");
  const [voltage, setVoltage] = useState("230");
  const [phase, setPhase] = useState<Phase>("single");
  const [pf, setPf] = useState("1");
  const [continuous, setContinuous] = useState(true);
  const [standard, setStandard] = useState<BreakerStandard>("nec");

  const loadAmps = useMemo(() => {
    if (mode === "amps") return num(amps);
    return convertPower({ phase, voltage: num(voltage), powerFactor: phase === "dc" ? 1 : num(pf), from: "watts", value: num(watts) })?.amps ?? NaN;
  }, [mode, amps, watts, voltage, phase, pf]);
  const result = sizeBreaker({ loadAmps, continuous, standard });

  return (
    <Shell
      inputs={
        <>
          <Field label="I know the load in…">
            <select value={mode} onChange={(e) => setMode(e.target.value as "amps" | "watts")} className={inputCls}>
              <option value="amps">Amps</option>
              <option value="watts">Watts</option>
            </select>
          </Field>
          {mode === "amps" ? (
            <Field label="Load current (A)"><NumberInput value={amps} onChange={setAmps} min={0} /></Field>
          ) : (
            <>
              <Field label="Load power (W)"><NumberInput value={watts} onChange={setWatts} min={0} /></Field>
              <Field label="Circuit type">
                <select value={phase} onChange={(e) => setPhase(e.target.value as Phase)} className={inputCls}>
                  <option value="single">Single-phase AC</option>
                  <option value="three">Three-phase AC</option>
                  <option value="dc">DC</option>
                </select>
              </Field>
              <Field label="Voltage (V)"><NumberInput value={voltage} onChange={setVoltage} min={1} /></Field>
              {phase !== "dc" ? <Field label="Power factor"><NumberInput value={pf} onChange={setPf} min={0.01} step="0.01" /></Field> : null}
            </>
          )}
          <Field label="Breaker rating standard">
            <select value={standard} onChange={(e) => setStandard(e.target.value as BreakerStandard)} className={inputCls}>
              <option value="nec">US / NEC standard ratings</option>
              <option value="iec">IEC / metric common ratings</option>
            </select>
          </Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <input type="checkbox" checked={continuous} onChange={(e) => setContinuous(e.target.checked)} className="mt-1 h-5 w-5 accent-emerald-600" />
            <span className="text-sm text-slate-700"><strong>Continuous load</strong> (runs 3 hours or more, e.g. EV charger, heater, lighting). Applies the 125% rule.</span>
          </label>
        </>
      }
      result={
        result ? (
          <>
            <Primary label="Minimum breaker rating" value={result.breaker !== null ? String(result.breaker) : "—"} unit={result.breaker !== null ? "A" : ""} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat label="Load current" value={n(loadAmps)} unit="A" />
              <Stat label="Design current" value={n(result.designAmps)} unit={continuous ? "A (×1.25)" : "A"} />
            </div>
            <Steps text={result.exceedsTable ? "Design current exceeds the listed standard sizes; use a larger frame or split the circuit." : `Design current ${n(result.designAmps)} A → next standard size up: ${result.breaker} A${result.maxContinuousOnBreaker ? ` (supports ${n(result.maxContinuousOnBreaker)} A continuous at 80%)` : ""}`} />
            <p className="mt-3 text-xs leading-5 text-amber-200">Check that the conductor ampacity is at least the breaker rating, then verify against local code, motor and special-load rules.</p>
            <CopyButton text={`Load ${n(loadAmps)} A → minimum breaker ${result.breaker ?? "n/a"} A (${standard.toUpperCase()}${continuous ? ", continuous ×1.25" : ""})`} />
          </>
        ) : (
          <Empty />
        )
      }
    />
  );
}

// ------------------------------------------------------------------ AWG

function AwgTool({ cfg }: { cfg: Extract<QuickToolConfig, { kind: "awg" }> }) {
  const [dir, setDir] = useState(cfg.direction ?? "awg-to-mm2");
  const [gauge, setGauge] = useState(12);
  const [area, setArea] = useState("6");

  const fromArea = useMemo(() => awgForArea(num(area)), [area]);
  const g = dir === "awg-to-mm2" ? gauge : fromArea;
  const geo = g !== null ? awgGeometry(g) : null;
  const metric = geo ? nearestMetricSize(geo.areaMm2 - 1e-6) : null;
  const amp = g !== null ? COPPER_75C_AMPACITY[g] : null;

  return (
    <Shell
      inputs={
        <>
          <Field label="Direction">
            <select value={dir} onChange={(e) => setDir(e.target.value as typeof dir)} className={inputCls}>
              <option value="awg-to-mm2">AWG → mm²</option>
              <option value="mm2-to-awg">mm² → AWG</option>
            </select>
          </Field>
          {dir === "awg-to-mm2" ? (
            <Field label="Wire gauge">
              <select value={gauge} onChange={(e) => setGauge(Number(e.target.value))} className={inputCls}>
                {AWG_LIST.map((x) => <option key={x} value={x}>{awgLabel(x)}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Cross-section needed (mm²)" hint="Returns the nearest AWG size at or above this area, so the conductor is never undersized.">
              <NumberInput value={area} onChange={setArea} min={0} />
            </Field>
          )}
        </>
      }
      result={
        geo ? (
          <>
            <Primary label={dir === "awg-to-mm2" ? "Cross-sectional area" : "Nearest AWG at or above"} value={dir === "awg-to-mm2" ? n(geo.areaMm2) : geo.label} unit={dir === "awg-to-mm2" ? "mm²" : ""} />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Gauge" value={geo.label} unit="" />
              <Stat label="Area" value={n(geo.areaMm2)} unit="mm²" />
              <Stat label="Diameter" value={n(geo.diameterMm)} unit="mm" />
              <Stat label="Circular mils" value={n(geo.kcmil, 2)} unit="kcmil" />
              <Stat label="Copper R @20 °C" value={n(geo.ohmPerKm20C, 3)} unit="Ω/km" />
              <Stat label="Nearest metric ≥" value={metric !== null ? String(metric) : "—"} unit="mm²" />
            </div>
            <Steps text={`d = 0.127 mm × 92^((36 − n) ÷ 39), A = π/4 × d² → ${geo.label}: d = ${n(geo.diameterMm)} mm, A = ${n(geo.areaMm2)} mm²`} />
            {amp ? <p className="mt-3 text-xs leading-5 text-slate-300">Reference ampacity: {amp} A (copper, 75 °C column, NEC Table 310.16). Not a design value; see the notes below.</p> : null}
            <CopyButton text={`${geo.label} = ${n(geo.areaMm2)} mm² (${n(geo.diameterMm)} mm diameter)`} />
          </>
        ) : (
          <Empty text="Enter a positive area, up to about 107 mm² (4/0 AWG)." />
        )
      }
    />
  );
}

// ------------------------------------------------------------------- HP

function HpTool({ cfg }: { cfg: Extract<QuickToolConfig, { kind: "hp" }> }) {
  const [dir, setDir] = useState(cfg.direction);
  const [value, setValue] = useState(dir === "kw-to-hp" ? "10" : "5");
  const [type, setType] = useState<HpType>("mechanical");
  const v = num(value);
  const out = Number.isFinite(v) && v >= 0 ? (dir === "kw-to-hp" ? kwToHp(v, type) : hpToKw(v, type)) : NaN;
  const unitIn = dir === "kw-to-hp" ? "kW" : "HP";
  const unitOut = dir === "kw-to-hp" ? "HP" : "kW";

  return (
    <Shell
      inputs={
        <>
          <Field label="Direction">
            <select value={dir} onChange={(e) => setDir(e.target.value as typeof dir)} className={inputCls}>
              <option value="kw-to-hp">kW → HP</option>
              <option value="hp-to-kw">HP → kW</option>
            </select>
          </Field>
          <Field label={`Value (${unitIn})`}><NumberInput value={value} onChange={setValue} min={0} /></Field>
          <Field label="Horsepower definition">
            <select value={type} onChange={(e) => setType(e.target.value as HpType)} className={inputCls}>
              {(Object.keys(HP_TYPES) as HpType[]).map((k) => <option key={k} value={k}>{HP_TYPES[k].label}</option>)}
            </select>
          </Field>
        </>
      }
      result={
        Number.isFinite(out) ? (
          <>
            <Primary label="Result" value={n(out, 4)} unit={unitOut} />
            <Steps text={dir === "kw-to-hp" ? `HP = kW × 1000 ÷ ${HP_TYPES[type].watts} = ${n(v)} × 1000 ÷ ${HP_TYPES[type].watts} = ${n(out, 4)} HP` : `kW = HP × ${HP_TYPES[type].watts} ÷ 1000 = ${n(v)} × ${HP_TYPES[type].watts} ÷ 1000 = ${n(out, 4)} kW`} />
            <p className="mt-3 text-xs leading-5 text-slate-300">Motor nameplates give <em>output</em> shaft power. Electrical input power is higher by the motor efficiency.</p>
            <CopyButton text={`${n(v)} ${unitIn} = ${n(out, 4)} ${unitOut}`} />
          </>
        ) : (
          <Empty />
        )
      }
    />
  );
}

// ----------------------------------------------------------------- Cost

const CURRENCIES = ["USD", "EUR", "GBP", "PKR", "INR", "AED", "SAR", "NGN", "ZAR", "CAD", "AUD", "PHP", "BDT", "EGP", "KES"];

function CostTool({ cfg }: { cfg: Extract<QuickToolConfig, { kind: "cost" }> }) {
  const [watts, setWatts] = useState("1500");
  const [hours, setHours] = useState("8");
  const [days, setDays] = useState("30");
  const [rate, setRate] = useState("0.15");
  const [cur, setCur] = useState("USD");
  const r = energyCost({ watts: num(watts), hoursPerDay: num(hours), daysPerMonth: num(days), ratePerKwh: num(rate) });
  const money = (x: number) => `${cur} ${x.toLocaleString("en-US", { maximumFractionDigits: x < 10 ? 2 : 0 })}`;

  return (
    <Shell
      inputs={
        <>
          <Field label="Appliance power (watts)" hint="Check the label or use a plug-in power meter. 1 kW = 1000 W."><NumberInput value={watts} onChange={setWatts} min={0} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Hours per day"><NumberInput value={hours} onChange={setHours} min={0} /></Field>
            <Field label="Days per month"><NumberInput value={days} onChange={setDays} min={0} /></Field>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-4">
            <Field label="Electricity rate (per kWh)"><NumberInput value={rate} onChange={setRate} min={0} /></Field>
            <Field label="Currency">
              <select value={cur} onChange={(e) => setCur(e.target.value)} className={inputCls}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        </>
      }
      result={
        r ? (
          <>
            <Primary label={cfg.unit === "kwh" ? "Energy per month" : "Cost per month"} value={cfg.unit === "kwh" ? n(r.kwhPerMonth) : money(r.costPerMonth)} unit={cfg.unit === "kwh" ? "kWh" : ""} />
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Energy / day" value={n(r.kwhPerDay)} unit="kWh" />
              <Stat label="Energy / year" value={n(r.kwhPerYear, 1)} unit="kWh" />
              <Stat label="Cost / day" value={money(r.costPerDay)} unit="" />
              <Stat label="Cost / month" value={money(r.costPerMonth)} unit="" />
              <Stat label="Cost / year" value={money(r.costPerYear)} unit="" />
              <Stat label="Energy / hour" value={n(r.kwhPerHour)} unit="kWh" />
            </div>
            <Steps text={`kWh = W × hours ÷ 1000 = ${n(num(watts))} × ${n(num(hours))} ÷ 1000 = ${n(r.kwhPerDay)} kWh/day. Cost = kWh × rate = ${n(r.kwhPerMonth)} × ${n(num(rate))} = ${money(r.costPerMonth)}/month`} />
            <CopyButton text={`${n(num(watts))} W for ${n(num(hours))} h/day = ${n(r.kwhPerMonth)} kWh/month = ${money(r.costPerMonth)}/month at ${n(num(rate))}/kWh`} />
          </>
        ) : (
          <Empty text="Enter power, hours (0–24), days and a rate." />
        )
      }
    />
  );
}

// ------------------------------------------------------------------ PFC

function PfcTool() {
  const [kw, setKw] = useState("100");
  const [pf1, setPf1] = useState("0.7");
  const [pf2, setPf2] = useState("0.95");
  const r = powerFactorCorrection({ kw: num(kw), pfExisting: num(pf1), pfTarget: num(pf2) });

  return (
    <Shell
      inputs={
        <>
          <Field label="Real power of the load (kW)"><NumberInput value={kw} onChange={setKw} min={0} /></Field>
          <Field label="Existing power factor"><NumberInput value={pf1} onChange={setPf1} min={0.01} step="0.01" /></Field>
          <Field label="Target power factor" hint="Utilities often require 0.90–0.95 or better."><NumberInput value={pf2} onChange={setPf2} min={0.01} step="0.01" /></Field>
        </>
      }
      result={
        r ? (
          <>
            <Primary label="Capacitor bank required" value={n(r.capacitorKvar)} unit="kvar" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Stat label="Apparent power before" value={n(r.kvaBefore)} unit="kVA" />
              <Stat label="Apparent power after" value={n(r.kvaAfter)} unit="kVA" />
              <Stat label="Reactive power before" value={n(r.kvarBefore)} unit="kvar" />
              <Stat label="Current reduction" value={n(r.currentReductionPct, 1)} unit="%" />
            </div>
            <Steps text={`kvar = kW × (tanφ₁ − tanφ₂) = ${n(num(kw))} × (${n(Math.tan(Math.acos(num(pf1))))} − ${n(Math.tan(Math.acos(num(pf2))))}) = ${n(r.capacitorKvar)} kvar`} />
            {!r.improves ? <p className="mt-3 text-xs text-amber-200">The target power factor is not higher than the existing one, so no correction is needed.</p> : null}
            <CopyButton text={`${n(num(kw))} kW, PF ${n(num(pf1))} → ${n(num(pf2))}: ${n(r.capacitorKvar)} kvar capacitor bank`} />
          </>
        ) : (
          <Empty text="Enter a positive kW and power factors between 0 and 1." />
        )
      }
    />
  );
}

export default function QuickTool({ config }: { config: QuickToolConfig }) {
  switch (config.kind) {
    case "power":
      return <PowerTool cfg={config} />;
    case "ohm":
      return <OhmTool />;
    case "breaker":
      return <BreakerTool />;
    case "awg":
      return <AwgTool cfg={config} />;
    case "hp":
      return <HpTool cfg={config} />;
    case "cost":
      return <CostTool cfg={config} />;
    case "pfc":
      return <PfcTool />;
  }
}
