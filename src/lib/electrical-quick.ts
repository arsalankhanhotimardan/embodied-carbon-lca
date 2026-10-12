/**
 * Pure maths for the quick electrical converters (/electrical/[slug]).
 * Shared by the client calculators and the server-rendered worked examples
 * and tables so the page text can never disagree with the tool.
 */
import { awgAreaMm2 } from "@/lib/electrical-engine";

export type Phase = "dc" | "single" | "three";
export type PowerQuantity = "amps" | "watts" | "kw" | "va" | "kva";

const SQRT3 = Math.sqrt(3);

/** Volt-amps (or watts for DC) per amp for the given circuit. */
const voltAmpsPerAmp = (phase: Phase, voltage: number) => (phase === "three" ? SQRT3 * voltage : voltage);

export type PowerSet = { amps: number; watts: number; kw: number; va: number; kva: number; powerFactor: number };

/**
 * Convert any one of A / W / kW / VA / kVA into all of them.
 * DC has no reactive power, so the power factor is forced to 1.
 */
export function convertPower(input: { phase: Phase; voltage: number; powerFactor: number; from: PowerQuantity; value: number }): PowerSet | null {
  const { phase, from, value } = input;
  const voltage = input.voltage;
  const pf = phase === "dc" ? 1 : input.powerFactor;
  if (![voltage, pf, value].every(Number.isFinite) || voltage <= 0 || pf <= 0 || pf > 1 || value < 0) return null;
  const vaPerAmp = voltAmpsPerAmp(phase, voltage);

  let va: number;
  switch (from) {
    case "amps":
      va = value * vaPerAmp;
      break;
    case "va":
      va = value;
      break;
    case "kva":
      va = value * 1000;
      break;
    case "watts":
      va = value / pf;
      break;
    case "kw":
      va = (value * 1000) / pf;
      break;
  }
  const watts = va * pf;
  return { amps: va / vaPerAmp, watts, kw: watts / 1000, va, kva: va / 1000, powerFactor: pf };
}

/** The textual formula for the chosen conversion, with the entered numbers substituted. */
export function powerFormulaText(input: { phase: Phase; voltage: number; powerFactor: number; from: PowerQuantity; to: PowerQuantity; value: number }, result: PowerSet): string {
  const { phase, voltage, powerFactor: pfIn, from, to } = input;
  const pf = phase === "dc" ? 1 : pfIn;
  const v = n(voltage);
  const root = phase === "three" ? "√3 × " : "";
  const pfText = phase === "dc" ? "" : ` × ${n(pf)}`;
  const aText = n(result.amps);

  if (from === "amps") {
    if (to === "watts" || to === "kw") return `P = ${root}V × I${pfText} = ${root}${v} × ${aText}${pfText} = ${n(result.watts)} W = ${n(result.kw)} kW`;
    return `S = ${root}V × I = ${root}${v} × ${aText} = ${n(result.va)} VA = ${n(result.kva)} kVA`;
  }
  if (to === "amps") {
    const pOrS = from === "watts" || from === "kw" ? `${n(result.watts)} W` : `${n(result.va)} VA`;
    const denom = from === "watts" || from === "kw" ? `(${root}${v}${pfText})` : `(${root}${v})`;
    return `I = ${from === "watts" || from === "kw" ? "P" : "S"} ÷ ${from === "watts" || from === "kw" ? `(${root}V${phase === "dc" ? "" : " × PF"})` : `(${root}V)`} = ${pOrS} ÷ ${denom} = ${aText} A`;
  }
  if ((from === "kva" || from === "va") && (to === "kw" || to === "watts")) return `P = S × PF = ${n(result.va)} VA × ${n(pf)} = ${n(result.watts)} W = ${n(result.kw)} kW`;
  if ((from === "kw" || from === "watts") && (to === "kva" || to === "va")) return `S = P ÷ PF = ${n(result.watts)} W ÷ ${n(pf)} = ${n(result.va)} VA = ${n(result.kva)} kVA`;
  return `S = ${n(result.va)} VA, P = ${n(result.watts)} W, I = ${aText} A`;
}

/** Compact number formatting used in formulas and tables. */
export function n(value: number, maxDecimals = 3): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const decimals = abs >= 1000 ? 1 : abs >= 100 ? 2 : maxDecimals;
  return Number(value.toFixed(decimals)).toLocaleString("en-US", { maximumFractionDigits: decimals });
}

// ---------------------------------------------------------------- Ohm's law

export type OhmInputs = { voltage?: number | null; current?: number | null; resistance?: number | null; power?: number | null };
export type OhmResult = { voltage: number; current: number; resistance: number; power: number };

const has = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

/** Solve V, I, R and P from any two positive known values. Returns null unless exactly two are usable. */
export function solveOhm(input: OhmInputs): OhmResult | null {
  const { voltage: V, current: I, resistance: R, power: P } = input;
  if (has(V) && has(I)) return { voltage: V, current: I, resistance: V / I, power: V * I };
  if (has(V) && has(R)) return { voltage: V, current: V / R, resistance: R, power: (V * V) / R };
  if (has(V) && has(P)) return { voltage: V, current: P / V, resistance: (V * V) / P, power: P };
  if (has(I) && has(R)) return { voltage: I * R, current: I, resistance: R, power: I * I * R };
  if (has(I) && has(P)) return { voltage: P / I, current: I, resistance: P / (I * I), power: P };
  if (has(R) && has(P)) return { voltage: Math.sqrt(P * R), current: Math.sqrt(P / R), resistance: R, power: P };
  return null;
}

// ------------------------------------------------------------------ Breakers

/** Standard overcurrent-device ratings in NEC 240.6(A). */
export const NEC_BREAKER_SIZES = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000, 1200, 1600, 2000];
/** Common IEC miniature-breaker / MCCB ratings. */
export const IEC_BREAKER_SIZES = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250];

export type BreakerStandard = "nec" | "iec";

export function sizeBreaker(input: { loadAmps: number; continuous: boolean; standard: BreakerStandard }) {
  const { loadAmps, continuous, standard } = input;
  if (!Number.isFinite(loadAmps) || loadAmps <= 0) return null;
  const sizes = standard === "nec" ? NEC_BREAKER_SIZES : IEC_BREAKER_SIZES;
  const design = continuous ? loadAmps * 1.25 : loadAmps;
  const next = sizes.find((s) => s >= design - 1e-9) ?? null;
  const prev = [...sizes].reverse().find((s) => s < design - 1e-9) ?? null;
  return { designAmps: design, breaker: next, nextSmaller: prev, maxContinuousOnBreaker: next ? next * 0.8 : null, exceedsTable: next === null };
}

// ----------------------------------------------------------------- Wire gauge

export const AWG_LIST = [18, 16, 14, 12, 10, 8, 6, 4, 3, 2, 1, 0, -1, -2, -3] as const;

export const awgLabel = (gauge: number): string => (gauge >= 1 ? `${gauge} AWG` : `${1 - gauge}/0 AWG`);

export function awgGeometry(gauge: number) {
  const areaMm2 = awgAreaMm2(gauge);
  const diameterMm = Math.sqrt((4 * areaMm2) / Math.PI);
  const circularMils = Math.pow(diameterMm / 0.0254, 2); // diameter in mils, squared
  return { gauge, label: awgLabel(gauge), areaMm2, diameterMm, circularMils, kcmil: circularMils / 1000, ohmPerKm20C: 17.241 / areaMm2 };
}

/** Nearest AWG size at or above the requested area (never undersizes). */
export function awgForArea(areaMm2: number) {
  if (!Number.isFinite(areaMm2) || areaMm2 <= 0) return null;
  const sorted = [...AWG_LIST].sort((a, b) => awgAreaMm2(a) - awgAreaMm2(b));
  return sorted.find((g) => awgAreaMm2(g) >= areaMm2 - 1e-9) ?? null;
}

/** NEC Table 310.16, copper, 75 °C column, 30 °C ambient, ≤3 current-carrying conductors. */
export const COPPER_75C_AMPACITY: Record<number, number | null> = {
  18: null, 16: null, 14: 20, 12: 25, 10: 35, 8: 50, 6: 65, 4: 85, 3: 100, 2: 115, 1: 130, 0: 150, [-1]: 175, [-2]: 200, [-3]: 230,
};

export const METRIC_STANDARD_MM2 = [0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];

export function nearestMetricSize(areaMm2: number): number | null {
  return METRIC_STANDARD_MM2.find((s) => s >= areaMm2 - 1e-9) ?? null;
}

// ----------------------------------------------------------------- Horsepower

export const HP_TYPES = {
  mechanical: { label: "Mechanical / imperial HP (745.7 W)", watts: 745.7 },
  electrical: { label: "Electrical HP (746 W)", watts: 746 },
  metric: { label: "Metric HP / PS (735.5 W)", watts: 735.49875 },
} as const;
export type HpType = keyof typeof HP_TYPES;

export const kwToHp = (kw: number, type: HpType) => (kw * 1000) / HP_TYPES[type].watts;
export const hpToKw = (hp: number, type: HpType) => (hp * HP_TYPES[type].watts) / 1000;

// ------------------------------------------------------------- Energy and cost

export function energyCost(input: { watts: number; hoursPerDay: number; daysPerMonth: number; ratePerKwh: number }) {
  const { watts, hoursPerDay, daysPerMonth, ratePerKwh } = input;
  if (![watts, hoursPerDay, daysPerMonth, ratePerKwh].every(Number.isFinite) || watts < 0 || hoursPerDay < 0 || hoursPerDay > 24 || daysPerMonth < 0 || ratePerKwh < 0) return null;
  const kwhPerDay = (watts * hoursPerDay) / 1000;
  const kwhPerMonth = kwhPerDay * daysPerMonth;
  const kwhPerYear = kwhPerMonth * 12;
  return {
    kwhPerHour: watts / 1000,
    kwhPerDay,
    kwhPerMonth,
    kwhPerYear,
    costPerDay: kwhPerDay * ratePerKwh,
    costPerMonth: kwhPerMonth * ratePerKwh,
    costPerYear: kwhPerYear * ratePerKwh,
  };
}

// --------------------------------------------------------- Power-factor correction

export function powerFactorCorrection(input: { kw: number; pfExisting: number; pfTarget: number }) {
  const { kw, pfExisting, pfTarget } = input;
  if (![kw, pfExisting, pfTarget].every(Number.isFinite) || kw <= 0) return null;
  if (pfExisting <= 0 || pfExisting > 1 || pfTarget <= 0 || pfTarget > 1) return null;
  const tan = (pf: number) => Math.tan(Math.acos(pf));
  const kvarBefore = kw * tan(pfExisting);
  const kvarAfter = kw * tan(pfTarget);
  const capacitorKvar = Math.max(0, kvarBefore - kvarAfter);
  const kvaBefore = kw / pfExisting;
  const kvaAfter = kw / pfTarget;
  return {
    kvarBefore,
    kvarAfter,
    capacitorKvar,
    kvaBefore,
    kvaAfter,
    currentReductionPct: (1 - kvaAfter / kvaBefore) * 100,
    improves: pfTarget > pfExisting,
  };
}
