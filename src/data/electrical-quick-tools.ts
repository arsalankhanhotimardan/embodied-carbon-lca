import type { QuickToolConfig } from "@/components/electrical/quick/QuickTool";
import { convertPower, energyCost, n, powerFactorCorrection, sizeBreaker, awgGeometry, hpToKw, kwToHp } from "@/lib/electrical-quick";

export type TableSpec =
  | { kind: "power-by-amps"; pf: number }
  | { kind: "amps-by-kw"; pf: number }
  | { kind: "kva-kw-pf" }
  | { kind: "hp-kw" }
  | { kind: "awg" }
  | { kind: "breakers" }
  | { kind: "appliances" }
  | { kind: "watts-kwh" }
  | { kind: "pfc" };

export type QuickToolPage = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  intro: string;
  tool: QuickToolConfig;
  formulas: { heading: string; lines: string[]; note?: string };
  example: { heading: string; body: string };
  sections: { heading: string; paragraphs: string[] }[];
  tables: TableSpec[];
  faqs: { question: string; answer: string }[];
  related: string[];
};

// ---- worked examples, computed with the same maths the calculator uses ----
const ex = (phase: "single" | "three" | "dc", voltage: number, pf: number, from: "amps" | "watts" | "kw" | "va" | "kva", value: number) => convertPower({ phase, voltage, powerFactor: pf, from, value })!;

const aw = ex("single", 120, 1, "amps", 15);
const ak = ex("three", 400, 0.85, "amps", 50);
const ka = ex("single", 230, 0.9, "kw", 10);
const kk = ex("single", 230, 0.8, "kw", 100);
const vk = ex("single", 230, 0.8, "kva", 50);
const av = ex("three", 400, 1, "amps", 100);
const uv = ex("single", 230, 0.6, "va", 1500);
const brk = sizeBreaker({ loadAmps: 32, continuous: true, standard: "nec" })!;
const g12 = awgGeometry(12);
const g4 = awgGeometry(4);
const cost = energyCost({ watts: 1500, hoursPerDay: 8, daysPerMonth: 30, ratePerKwh: 0.15 })!;
const wk = energyCost({ watts: 100, hoursPerDay: 5, daysPerMonth: 30, ratePerKwh: 0.15 })!;
const pfc = powerFactorCorrection({ kw: 100, pfExisting: 0.7, pfTarget: 0.95 })!;

export const QUICK_TOOLS: QuickToolPage[] = [
  {
    slug: "amps-to-watts-calculator",
    title: "Amps to Watts Calculator",
    metaTitle: "Amps to Watts Calculator | DC, 1-Phase & 3-Phase",
    metaDescription: "Free amps to watts calculator for DC, single-phase and three-phase circuits. Enter amps, voltage and power factor to get watts, kW and VA instantly, with formulas and examples.",
    eyebrow: "Current → real power",
    intro: "Convert current in amps to real power in watts. Choose DC, single-phase or three-phase, enter the voltage and power factor, and see the steps.",
    tool: { kind: "power", from: "amps", to: "watts", value: 15, voltage: 120, phase: "single", powerFactor: 1 },
    formulas: {
      heading: "Amps to watts formulas",
      lines: ["DC: P (W) = V × I", "Single-phase AC: P (W) = V × I × PF", "Three-phase AC: P (W) = √3 × V(line-to-line) × I × PF"],
      note: "P is real power in watts, V is voltage, I is current in amps and PF is power factor (0 to 1). DC and purely resistive loads have PF = 1.",
    },
    example: {
      heading: "Worked example: 15 A on a 120 V circuit",
      body: `A 15 A branch circuit at 120 V with a resistive load (PF = 1) carries P = 120 × 15 × 1 = ${n(aw.watts)} W (${n(aw.kw)} kW). With a motor load at PF 0.8 the same current represents only ${n(aw.va * 0.8)} W of real power, even though it still draws ${n(aw.va)} VA.`,
    },
    sections: [
      {
        heading: "Why amps alone do not give watts",
        paragraphs: [
          "Amps measure how much current flows. Watts measure how much of that flow does useful work. The two are linked by voltage, and on AC circuits also by power factor, which describes how well the current lines up with the voltage.",
          "That is why a 10 A load at 230 V can be 2,300 W for a heater, but noticeably less for a motor or a switch-mode power supply. If you do not know the power factor, use 1.0 for heaters and incandescent lighting, about 0.8 for induction motors and 0.9 as a rough value for a mixed load.",
        ],
      },
      {
        heading: "Three-phase: use line-to-line voltage",
        paragraphs: ["For a balanced three-phase load, the √3 (about 1.732) factor accounts for the 120° phase shift between the three conductors. Always enter the line-to-line voltage, for example 400 V in much of the world or 208/480 V in North America, not the line-to-neutral value."],
      },
    ],
    tables: [{ kind: "power-by-amps", pf: 1 }],
    faqs: [
      { question: "How many watts is 1 amp?", answer: "It depends on voltage. At 120 V, 1 A is 120 W; at 230 V it is 230 W (with a power factor of 1). On a 12 V DC system, 1 A is 12 W." },
      { question: "How do I convert amps to watts without knowing the voltage?", answer: "You cannot. Amps and watts are only related through voltage. Check the supply voltage on the equipment label or measure it." },
      { question: "Is a watt the same as a volt-amp?", answer: "Only when the power factor is 1. Watts are real power; volt-amps (VA) are apparent power. VA = W ÷ PF." },
      { question: "What power factor should I use?", answer: "Use the value on the nameplate if there is one. Otherwise 1.0 for resistive loads, 0.8 to 0.85 for motors and about 0.9 for general mixed loads." },
    ],
    related: ["amps-to-kw-calculator", "kw-to-amps-calculator", "amps-to-kva-calculator", "ohms-law-calculator"],
  },
  {
    slug: "amps-to-kw-calculator",
    title: "Amps to kW Calculator",
    metaTitle: "Amps to kW Calculator | Single & 3-Phase",
    metaDescription: "Convert amps to kilowatts for DC, single-phase and three-phase systems. Enter current, voltage and power factor for kW and kVA with the formula shown.",
    eyebrow: "Current → kilowatts",
    intro: "Convert current in amps to real power in kilowatts. Useful for sizing generators, checking motor loads and reading a clamp-meter result.",
    tool: { kind: "power", from: "amps", to: "kw", value: 50, voltage: 400, phase: "three", powerFactor: 0.85 },
    formulas: {
      heading: "Amps to kW formulas",
      lines: ["DC: kW = V × I ÷ 1000", "Single-phase: kW = V × I × PF ÷ 1000", "Three-phase: kW = √3 × V(line-to-line) × I × PF ÷ 1000"],
      note: "Divide watts by 1000 to get kilowatts.",
    },
    example: {
      heading: "Worked example: 50 A on a 400 V three-phase feeder",
      body: `At PF 0.85, P = 1.732 × 400 × 50 × 0.85 ÷ 1000 = ${n(ak.kw)} kW. The apparent power is ${n(ak.kva)} kVA. A generator for this load must be rated in kVA, so it would need at least ${n(ak.kva)} kVA before any margin.`,
    },
    sections: [
      {
        heading: "kW is not the same as kVA",
        paragraphs: [
          "Real power (kW) is the energy actually converted to work or heat. Apparent power (kVA) is what the supply must deliver. Generators, transformers and UPS units are rated in kVA because their conductors and windings carry the full current regardless of power factor.",
          "When you clamp a current and compute kW, remember that low power factor means the supply is working harder than the kW figure suggests. That is why utilities may charge for low power factor and why correction capacitors can free up capacity.",
        ],
      },
      {
        heading: "Measuring the current correctly",
        paragraphs: ["Clamp one phase conductor at a time, with the load running normally. On a balanced three-phase load the three readings should be close. Large differences mean the load is unbalanced and a single-phase reading will give misleading three-phase kW."],
      },
    ],
    tables: [{ kind: "power-by-amps", pf: 0.9 }],
    faqs: [
      { question: "How many kW is 100 amps?", answer: "At 230 V single-phase and PF 1, 100 A is 23 kW. At 400 V three-phase and PF 0.9, it is about 62.4 kW. Voltage and phase make the difference." },
      { question: "How do I convert amps to kW for a three-phase motor?", answer: "Use kW = √3 × V × I × PF ÷ 1000 with the line-to-line voltage and the motor's power factor. For shaft power also multiply by efficiency." },
      { question: "Why does my calculated kW differ from the meter?", answer: "The usual causes are the wrong power factor, an unbalanced load, harmonic distortion or measuring a voltage other than the real supply voltage." },
      { question: "Can I convert amps to kW for DC?", answer: "Yes: kW = V × I ÷ 1000. DC has no power factor, so the PF input is ignored." },
    ],
    related: ["amps-to-watts-calculator", "kw-to-amps-calculator", "kw-to-kva-calculator", "power-factor-correction-calculator"],
  },
  {
    slug: "kw-to-amps-calculator",
    title: "kW to Amps Calculator",
    metaTitle: "kW to Amps Calculator | Single & 3-Phase",
    metaDescription: "Convert kilowatts to amps for DC, single-phase and three-phase circuits. Enter kW, voltage and power factor to get current, with formulas and a quick-reference table.",
    eyebrow: "Kilowatts → current",
    intro: "Find the current drawn by a load rated in kilowatts. Essential for choosing cable and breaker sizes for heaters, motors, EV chargers and generators.",
    tool: { kind: "power", from: "kw", to: "amps", value: 10, voltage: 230, phase: "single", powerFactor: 0.9 },
    formulas: {
      heading: "kW to amps formulas",
      lines: ["DC: I = kW × 1000 ÷ V", "Single-phase: I = kW × 1000 ÷ (V × PF)", "Three-phase: I = kW × 1000 ÷ (√3 × V(line-to-line) × PF)"],
    },
    example: {
      heading: "Worked example: a 10 kW load on 230 V",
      body: `At PF 0.9, I = 10,000 ÷ (230 × 0.9) = ${n(ka.amps)} A. At PF 1.0 the same 10 kW would draw only ${n(10000 / 230)} A, which shows how much a poor power factor costs in cable and breaker capacity.`,
    },
    sections: [
      {
        heading: "From current to cable and breaker",
        paragraphs: [
          "Once you have the current, the next steps are the protective device and the conductor. For continuous loads such as EV chargers and heaters, many codes require the circuit to be rated at 125% of the load current. The breaker size calculator on this site applies that rule and picks the next standard rating.",
          "Cable size also depends on length. A cable that is fine thermally can still lose too much voltage on a long run, so check the voltage drop with the voltage drop calculator before ordering.",
        ],
      },
      {
        heading: "Choosing the voltage and phase",
        paragraphs: ["Use the nominal supply voltage of the circuit: 120 or 240 V for US single-phase, 230 V for most of Europe, Asia and Africa, and 400 V (or 208/480 V) line-to-line for three-phase. Entering the wrong voltage is the most common source of error."],
      },
    ],
    tables: [{ kind: "amps-by-kw", pf: 0.9 }],
    faqs: [
      { question: "How many amps is 1 kW?", answer: "At 230 V single-phase and PF 1, 1 kW is about 4.35 A. At 120 V it is about 8.33 A. At 400 V three-phase and PF 0.9 it is about 1.6 A." },
      { question: "How many amps is 5 kW at 230 V?", answer: `At PF 1 it is ${n(5000 / 230)} A. At PF 0.9 it is about ${n(5000 / (230 * 0.9))} A.` },
      { question: "Why is three-phase current lower for the same kW?", answer: "The load is shared across three conductors. Each carries roughly 58% (1 ÷ √3) of the current a single-phase supply of the same line voltage would need." },
      { question: "Do I convert kW or kVA to amps for a generator?", answer: "Use kVA for the generator's capacity limit (I = kVA × 1000 ÷ (√3 × V)). Use kW with power factor to find the current a particular load draws." },
    ],
    related: ["amps-to-kw-calculator", "breaker-size-calculator", "kw-to-kva-calculator", "ohms-law-calculator"],
  },
  {
    slug: "kw-to-kva-calculator",
    title: "kW to kVA Calculator",
    metaTitle: "kW to kVA Calculator | Power Factor Conversion",
    metaDescription: "Convert kW to kVA using power factor. Free calculator with the formula, a worked example and a kVA table for generator and transformer sizing.",
    eyebrow: "Real power → apparent power",
    intro: "Convert real power in kilowatts to apparent power in kilovolt-amps. You need the power factor, because kVA = kW ÷ PF.",
    tool: { kind: "power", from: "kw", to: "kva", value: 100, powerFactor: 0.8 },
    formulas: {
      heading: "kW to kVA formula",
      lines: ["kVA = kW ÷ PF", "kW = kVA × PF"],
      note: "The formula is the same for single-phase and three-phase because both quantities are total power.",
    },
    example: {
      heading: "Worked example: a 100 kW load at PF 0.8",
      body: `kVA = 100 ÷ 0.8 = ${n(kk.kva)} kVA. A generator or transformer serving this load must be rated for at least ${n(kk.kva)} kVA, not 100 kVA. At PF 0.95 the same load needs only ${n(100 / 0.95)} kVA.`,
    },
    sections: [
      {
        heading: "Why equipment is rated in kVA",
        paragraphs: [
          "A generator's windings and a transformer's conductors heat up with current, and current depends on kVA, not kW. A 100 kVA unit can supply 100 kW to a resistive load, but only 80 kW to a load with a power factor of 0.8.",
          "When sizing, work out the total real power, divide by the power factor to get kVA, then add margin for motor starting and future growth.",
        ],
      },
      { heading: "Improving the power factor", paragraphs: ["Raising the power factor lowers the kVA needed for the same kW. Capacitor banks are the usual fix for inductive loads, and the power factor correction calculator shows how many kvar you need."] },
    ],
    tables: [{ kind: "kva-kw-pf" }],
    faqs: [
      { question: "How do I convert kW to kVA?", answer: "Divide kW by the power factor. For example, 80 kW at PF 0.8 equals 100 kVA." },
      { question: "What power factor should I assume?", answer: "Without data, 0.8 is a common conservative planning value for mixed industrial loads and 0.9 for commercial buildings. Resistive loads use 1.0." },
      { question: "Is kVA always larger than kW?", answer: "kVA is equal to or larger than kW. They are equal only when the power factor is 1." },
      { question: "Does it matter if the system is single or three-phase?", answer: "Not for this conversion. Phase only matters when you convert to or from amps." },
    ],
    related: ["kva-to-kw-calculator", "power-factor-correction-calculator", "kw-to-amps-calculator", "va-to-watts-calculator"],
  },
  {
    slug: "kva-to-kw-calculator",
    title: "kVA to kW Calculator",
    metaTitle: "kVA to kW Calculator | Power Factor Conversion",
    metaDescription: "Convert kVA to kW using power factor. Free calculator with the formula, an example and a table of kW values at common power factors.",
    eyebrow: "Apparent power → real power",
    intro: "Convert apparent power in kVA to real power in kW. Multiply by the power factor to find what the equipment can actually deliver.",
    tool: { kind: "power", from: "kva", to: "kw", value: 50, powerFactor: 0.8 },
    formulas: { heading: "kVA to kW formula", lines: ["kW = kVA × PF", "kVA = kW ÷ PF"] },
    example: {
      heading: "Worked example: a 50 kVA generator at PF 0.8",
      body: `kW = 50 × 0.8 = ${n(vk.kw)} kW. The generator's nameplate usually quotes both figures, for example 50 kVA / 40 kW at PF 0.8, so you can check the real power available to your loads.`,
    },
    sections: [
      {
        heading: "Reading generator and UPS ratings",
        paragraphs: [
          "Generator sets are normally rated at a power factor of 0.8, so the kW rating is 80% of the kVA rating. UPS systems vary: older units were rated at 0.6 to 0.8, while many modern units are rated at 0.9 to 1.0. Always read the kW figure for real loads.",
          "If your loads are mostly electronic with a high power factor, you can use more of the kVA rating as kW. If they are motors, expect to be closer to 0.8 or lower, and check starting current separately.",
        ],
      },
    ],
    tables: [{ kind: "kva-kw-pf" }],
    faqs: [
      { question: "How many kW is 100 kVA?", answer: "At power factor 0.8 it is 80 kW; at 0.9 it is 90 kW; at 1.0 it is 100 kW." },
      { question: "How do I convert kVA to kW for a transformer?", answer: "Multiply by the load's power factor. The transformer's own limit is still in kVA, so kW capacity falls as power factor falls." },
      { question: "Can kW be larger than kVA?", answer: "No. Real power can never exceed apparent power." },
      { question: "What is the difference between kVA and kVAR?", answer: "kVAR is reactive power. kVA is the vector sum of kW and kVAR: kVA² = kW² + kVAR²." },
    ],
    related: ["kw-to-kva-calculator", "amps-to-kva-calculator", "power-factor-correction-calculator", "va-to-watts-calculator"],
  },
  {
    slug: "amps-to-kva-calculator",
    title: "Amps to kVA Calculator",
    metaTitle: "Amps to kVA Calculator | Single & 3-Phase",
    metaDescription: "Convert amps to kVA for single-phase and three-phase systems. Enter current and voltage to get apparent power for transformer, generator and UPS sizing.",
    eyebrow: "Current → apparent power",
    intro: "Convert current in amps to apparent power in kVA. Power factor is not needed because kVA already includes both real and reactive power.",
    tool: { kind: "power", from: "amps", to: "kva", value: 100, voltage: 400, phase: "three" },
    formulas: {
      heading: "Amps to kVA formulas",
      lines: ["Single-phase: kVA = V × I ÷ 1000", "Three-phase: kVA = √3 × V(line-to-line) × I ÷ 1000"],
    },
    example: {
      heading: "Worked example: 100 A at 400 V three-phase",
      body: `kVA = 1.732 × 400 × 100 ÷ 1000 = ${n(av.kva)} kVA. A transformer or generator feeding this load needs at least ${n(av.kva)} kVA. To estimate kW multiply by the power factor.`,
    },
    sections: [
      {
        heading: "Sizing a transformer or generator from current",
        paragraphs: [
          "If you know the maximum current the load will draw, kVA is the right number to compare against equipment ratings. Add margin of 10 to 25% for growth, and check motor starting current, which can be five to seven times running current for a few seconds.",
          "For three-phase equipment, use the line-to-line voltage and the line current. A balanced load draws the same current in all three phases.",
        ],
      },
    ],
    tables: [{ kind: "power-by-amps", pf: 0.9 }],
    faqs: [
      { question: "How many kVA is 100 amps?", answer: "At 230 V single-phase it is 23 kVA. At 400 V three-phase it is about 69.3 kVA." },
      { question: "Why is power factor not needed?", answer: "kVA is apparent power, V × I. Power factor only converts it to real power (kW)." },
      { question: "How do I get kVA from amps for a single-phase 120 V circuit?", answer: "Multiply 120 by the current and divide by 1000. A 50 A circuit is 6 kVA." },
      { question: "Is amps to kVA different for DC?", answer: "For DC, volt-amps equal watts, so kVA is just V × I ÷ 1000 and equals kW." },
    ],
    related: ["amps-to-kw-calculator", "kva-to-kw-calculator", "kw-to-kva-calculator", "va-to-watts-calculator"],
  },
  {
    slug: "va-to-watts-calculator",
    title: "VA to Watts Calculator",
    metaTitle: "VA to Watts Calculator | UPS & Power Factor",
    metaDescription: "Convert VA to watts (and watts to VA) using power factor. Handy for UPS, inverter and power-supply ratings, with examples and a conversion table.",
    eyebrow: "Volt-amps ↔ watts",
    intro: "Convert apparent power in volt-amps to real power in watts, and back, with the power factor. This is the number that matters when you read a UPS or inverter label.",
    tool: { kind: "power", from: "va", to: "watts", value: 1500, powerFactor: 0.6 },
    formulas: { heading: "VA to watts formulas", lines: ["W = VA × PF", "VA = W ÷ PF"] },
    example: {
      heading: "Worked example: a 1500 VA UPS",
      body: `A UPS labelled 1500 VA with a power factor of 0.6 supplies ${n(uv.watts)} W of real power: 1500 × 0.6 = ${n(uv.watts)} W. If you connect a 1,000 W computer load, it exceeds the watt rating even though the VA figure looks sufficient.`,
    },
    sections: [
      {
        heading: "Always check both ratings",
        paragraphs: [
          "UPS and inverter labels quote both VA and watts. The lower of the two limits what you can connect, after allowing for the load's own power factor. A load drawing 800 VA at PF 0.9 is 720 W, so it fits a 1000 VA / 600 W unit on VA but not on watts.",
          "To choose a unit, add up the real power of everything you plan to connect, then divide by the unit's power factor (or read its watt rating directly) and add 20 to 25% headroom.",
        ],
      },
    ],
    tables: [{ kind: "kva-kw-pf" }],
    faqs: [
      { question: "Is VA the same as watts?", answer: "No. VA is apparent power, watts is real power. They are equal only at a power factor of 1." },
      { question: "How do I convert watts to VA?", answer: "Divide watts by the power factor. A 600 W load at PF 0.6 needs 1000 VA." },
      { question: "What is a typical UPS power factor?", answer: "Older small UPS units are around 0.6. Many newer ones are rated at 0.9 to 1.0. Check the label." },
      { question: "Why do some inverters list both?", answer: "Because inverter output current is limited by VA, while the loads consume watts. The watt rating shows how much real load the unit can handle." },
    ],
    related: ["kva-to-kw-calculator", "kw-to-kva-calculator", "amps-to-watts-calculator", "power-factor-correction-calculator"],
  },
  {
    slug: "ohms-law-calculator",
    title: "Ohm's Law Calculator",
    metaTitle: "Ohm's Law Calculator | Voltage, Current, Resistance, Power",
    metaDescription: "Free Ohm's law calculator: enter any two of voltage, current, resistance and power to solve the other two. Includes the formula wheel and worked examples.",
    eyebrow: "V • I • R • P",
    intro: "Enter any two of voltage, current, resistance and power and the calculator solves the other two using Ohm's law and the power law.",
    tool: { kind: "ohm" },
    formulas: {
      heading: "Ohm's law and power formulas",
      lines: ["V = I × R", "I = V ÷ R", "R = V ÷ I", "P = V × I = I² × R = V² ÷ R"],
      note: "V in volts, I in amps, R in ohms, P in watts.",
    },
    example: {
      heading: "Worked example: a 12 V circuit with a 6 Ω load",
      body: "Current I = 12 ÷ 6 = 2 A. Power P = 12 × 2 = 24 W. If the supply rose to 24 V the current would double to 4 A and the power would quadruple to 96 W, because power depends on voltage squared.",
    },
    sections: [
      {
        heading: "Where Ohm's law applies",
        paragraphs: [
          "Ohm's law describes resistive elements: heaters, incandescent lamps, resistors and cables. For AC loads with reactance, such as motors and transformers, impedance replaces resistance and power factor links watts to volt-amps.",
          "Cable resistance is why voltage drops along a long run: the current flowing through the conductor's resistance causes a loss of I × R volts. The voltage drop calculator applies this to real cable data.",
        ],
      },
      {
        heading: "Common mistakes",
        paragraphs: ["Mixing units is the most common error: milliamps instead of amps, kilohms instead of ohms. Convert to base units first. Also remember that a lamp's resistance rises when hot, so the cold resistance you measure with a meter is lower than the operating value."],
      },
    ],
    tables: [],
    faqs: [
      { question: "How do I find current from voltage and resistance?", answer: "Divide voltage by resistance: I = V ÷ R. For example 24 V across 12 Ω gives 2 A." },
      { question: "How do I find resistance from power and current?", answer: "Use R = P ÷ I². A 100 W load drawing 5 A has a resistance of 4 Ω." },
      { question: "What is the power formula?", answer: "P = V × I. Substituting Ohm's law gives P = I² × R and P = V² ÷ R." },
      { question: "Does Ohm's law work for AC?", answer: "For resistive AC loads, yes, using RMS values. For reactive loads use impedance and include power factor." },
    ],
    related: ["amps-to-watts-calculator", "kw-to-amps-calculator", "awg-to-mm2-calculator", "electricity-cost-calculator"],
  },
  {
    slug: "breaker-size-calculator",
    title: "Breaker Size Calculator",
    metaTitle: "Circuit Breaker Size Calculator | Amps, Watts & 125% Rule",
    metaDescription: "Find the right circuit breaker size from load amps or watts. Applies the 125% continuous-load rule and picks the next standard NEC or IEC rating, with a sizes chart.",
    eyebrow: "125% rule • standard ratings",
    intro: "Enter your load in amps or watts and get the minimum breaker rating. The calculator applies the 125% continuous-load rule and rounds up to the next standard size.",
    tool: { kind: "breaker" },
    formulas: {
      heading: "Breaker sizing steps",
      lines: ["1. Load current I (A) = P ÷ (V × PF) for single-phase, or P ÷ (√3 × V × PF) for three-phase", "2. Design current = 1.25 × I for continuous loads, otherwise I", "3. Breaker = next standard rating at or above the design current"],
      note: "A continuous load runs at maximum current for 3 hours or more. Many codes, such as NEC 210.20(A), require the breaker to be rated for 125% of it.",
    },
    example: {
      heading: "Worked example: a 32 A continuous EV charger",
      body: `Design current = 32 × 1.25 = ${n(brk.designAmps)} A, so the next standard NEC size is ${brk.breaker} A. The breaker supports ${n(brk.maxContinuousOnBreaker ?? 0)} A of continuous load, which matches the charger's 32 A rating.`,
    },
    sections: [
      {
        heading: "The breaker protects the wire, not the load",
        paragraphs: [
          "A breaker must trip before the conductor overheats, so the wire's ampacity must be at least the breaker rating (with limited exceptions for small conductors and motor circuits). Choose the breaker first, then check that the cable is rated for it under your installation conditions.",
          "Use the AWG to mm² page for conductor dimensions, and the voltage drop calculator to confirm a long cable still delivers adequate voltage.",
        ],
      },
      {
        heading: "When this calculator is not enough",
        paragraphs: ["Motor circuits, welders, air conditioners with a minimum-circuit-ampacity label, solar inverters and feeders with mixed loads have their own sizing rules. Follow the equipment nameplate and your local electrical code, and have a qualified electrician confirm the design."],
      },
    ],
    tables: [{ kind: "breakers" }],
    faqs: [
      { question: "What is the 125% rule for breakers?", answer: "For continuous loads, the breaker and conductors must be rated for at least 125% of the load current, which limits continuous use to 80% of the breaker rating." },
      { question: "What size breaker do I need for 5000 watts?", answer: "At 230 V single-phase and PF 1 the load is 21.7 A. If continuous, design current is 27.2 A and the next standard size is 30 A. At 120 V it is 41.7 A, so a 60 A breaker if continuous." },
      { question: "Can I use a larger breaker than calculated?", answer: "Only if the wire and equipment are rated for it. An oversized breaker may not trip before the wire overheats." },
      { question: "What are standard breaker sizes?", answer: "US/NEC ratings include 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175 and 200 A and upward. IEC miniature breakers are commonly 6, 10, 16, 20, 25, 32, 40, 50 and 63 A." },
    ],
    related: ["kw-to-amps-calculator", "awg-to-mm2-calculator", "wire-size-calculator", "voltage-drop-calculator"],
  },
  {
    slug: "awg-to-mm2-calculator",
    title: "AWG to mm² Calculator",
    metaTitle: "AWG to mm² Calculator | Wire Gauge Conversion Chart",
    metaDescription: "Convert AWG wire gauge to mm² and back. Includes diameter, circular mils, resistance per km and a full AWG chart from 18 AWG to 4/0 with reference ampacity.",
    eyebrow: "Wire gauge • area • diameter",
    intro: "Convert American Wire Gauge to cross-sectional area in square millimetres, or find the nearest AWG for a metric size. The chart lists every common gauge.",
    tool: { kind: "awg" },
    formulas: {
      heading: "AWG formulas",
      lines: ["Diameter (mm) = 0.127 × 92^((36 − n) ÷ 39)", "Area (mm²) = π ÷ 4 × diameter²", "Resistance (Ω/km, copper at 20 °C) ≈ 17.241 ÷ area (mm²)"],
      note: "For 1/0, 2/0, 3/0 and 4/0 use n = 0, −1, −2 and −3.",
    },
    example: {
      heading: "Worked example: 12 AWG and 4 AWG",
      body: `12 AWG has a diameter of ${n(g12.diameterMm)} mm and an area of ${n(g12.areaMm2)} mm², so the nearest metric size is 4 mm² (rounding up). 4 AWG is ${n(g4.areaMm2)} mm², close to 25 mm² (rounding up). Remember that smaller AWG numbers mean thicker wire.`,
    },
    sections: [
      {
        heading: "How AWG numbers work",
        paragraphs: [
          "AWG is a logarithmic scale. Every 6 gauge steps the diameter roughly halves, and every 3 steps the area roughly halves. That is why 10 AWG has about twice the area of 13 AWG and why going from 12 AWG to 10 AWG gives a worthwhile jump in capacity.",
          "Metric cables are sold in fixed cross-sections (1.5, 2.5, 4, 6, 10, 16, 25 mm² and so on). AWG and metric sizes do not match exactly, so always round up to the next metric size, never down.",
        ],
      },
      {
        heading: "Reference ampacity in the chart",
        paragraphs: ["The ampacity column shows NEC Table 310.16 values for copper conductors with 75 °C insulation at 30 °C ambient and no more than three current-carrying conductors in a raceway. Real ampacity depends on insulation rating, ambient temperature, bundling, termination temperature and local code, and overcurrent rules limit small conductors (14, 12 and 10 AWG) to 15, 20 and 30 A. Use it as a reference, not as a design value."],
      },
    ],
    tables: [{ kind: "awg" }],
    faqs: [
      { question: "What is 12 AWG in mm²?", answer: `About ${n(g12.areaMm2)} mm² with a diameter of ${n(g12.diameterMm)} mm.` },
      { question: "What AWG is 2.5 mm²?", answer: "2.5 mm² lies between 14 AWG (2.08 mm²) and 12 AWG (3.31 mm²). The nearest AWG at or above is 12 AWG." },
      { question: "Is a lower AWG number thicker or thinner?", answer: "Thicker. 4 AWG is much thicker than 14 AWG, and 4/0 is thicker still." },
      { question: "How do I convert mm² to AWG?", answer: "Use the converter above in the mm² → AWG direction. It returns the nearest AWG size at or above the area you enter." },
    ],
    related: ["breaker-size-calculator", "kw-to-amps-calculator", "ohms-law-calculator", "electricity-cost-calculator"],
  },
  {
    slug: "kw-to-hp-calculator",
    title: "kW to HP Calculator",
    metaTitle: "kW to HP Calculator | Kilowatts to Horsepower",
    metaDescription: "Convert kilowatts to horsepower (mechanical, electrical or metric). Free kW to HP calculator with the formula, examples and a motor size table.",
    eyebrow: "Kilowatts → horsepower",
    intro: "Convert kilowatts to horsepower. Choose mechanical, electrical or metric horsepower, since the three definitions differ slightly.",
    tool: { kind: "hp", direction: "kw-to-hp" },
    formulas: {
      heading: "kW to HP formula",
      lines: ["HP (mechanical) = kW × 1000 ÷ 745.7 ≈ kW × 1.341", "HP (electrical) = kW × 1000 ÷ 746", "HP (metric, PS) = kW × 1000 ÷ 735.5 ≈ kW × 1.360"],
    },
    example: {
      heading: "Worked example: a 10 kW motor",
      body: `10 kW equals ${n(kwToHp(10, "mechanical"), 2)} mechanical HP, or ${n(kwToHp(10, "metric"), 2)} metric HP. A motor nameplate that says 10 kW is shaft output power; its electrical input power is higher by the efficiency loss.`,
    },
    sections: [
      {
        heading: "Which horsepower?",
        paragraphs: ["Most North American motor nameplates use mechanical horsepower (745.7 W). Many European and Asian specifications use metric horsepower (PS or CV, 735.5 W). The difference is about 1.4%, which rarely matters for selection but can for precise specifications."],
      },
      {
        heading: "From motor kW to electrical current",
        paragraphs: ["To size cable and protection for a motor, convert shaft kW to input power by dividing by efficiency, then to current using the power factor. The kW to amps calculator handles the last step, and motor protection should follow the nameplate full-load current and code rules."],
      },
    ],
    tables: [{ kind: "hp-kw" }],
    faqs: [
      { question: "How many HP is 1 kW?", answer: "1 kW is about 1.341 mechanical HP or 1.36 metric HP." },
      { question: "How many HP is 5 kW?", answer: `About ${n(kwToHp(5, "mechanical"), 2)} mechanical HP.` },
      { question: "Is a 'ton' of air conditioning the same as HP?", answer: "No. A ton of cooling is 3.517 kW of heat removal. The electrical input of an AC is much smaller than its cooling capacity." },
      { question: "Is motor HP input or output power?", answer: "Output shaft power. Input power is output divided by efficiency." },
    ],
    related: ["hp-to-kw-calculator", "kw-to-amps-calculator", "amps-to-kw-calculator", "electricity-cost-calculator"],
  },
  {
    slug: "hp-to-kw-calculator",
    title: "HP to kW Calculator",
    metaTitle: "HP to kW Calculator | Horsepower to Kilowatts",
    metaDescription: "Convert horsepower to kilowatts (mechanical, electrical or metric). Free HP to kW calculator with formula, examples and a motor conversion table.",
    eyebrow: "Horsepower → kilowatts",
    intro: "Convert horsepower to kilowatts for motors, pumps, engines and generators. Select the horsepower definition that matches your equipment.",
    tool: { kind: "hp", direction: "hp-to-kw" },
    formulas: {
      heading: "HP to kW formula",
      lines: ["kW = HP × 745.7 ÷ 1000 ≈ HP × 0.7457 (mechanical)", "kW = HP × 746 ÷ 1000 (electrical)", "kW = HP × 735.5 ÷ 1000 ≈ HP × 0.7355 (metric)"],
    },
    example: {
      heading: "Worked example: a 5 HP pump motor",
      body: `5 mechanical HP equals ${n(hpToKw(5, "mechanical"), 3)} kW of shaft output. At 90% motor efficiency the electrical input is about ${n(hpToKw(5, "mechanical") / 0.9, 2)} kW, which is what your meter and cable must supply.`,
    },
    sections: [
      {
        heading: "Selecting a generator or inverter for a motor",
        paragraphs: ["Convert the motor's HP to kW for input power, then allow for starting current. Induction motors can draw five to seven times full-load current when starting, so a generator or inverter often needs to be two to three times the running kW unless the motor uses a soft starter or VFD."],
      },
    ],
    tables: [{ kind: "hp-kw" }],
    faqs: [
      { question: "How many kW is 1 HP?", answer: "About 0.7457 kW (mechanical horsepower)." },
      { question: "How many kW is a 10 HP motor?", answer: `About ${n(hpToKw(10, "mechanical"), 2)} kW of shaft output power.` },
      { question: "How many kW is 3 HP?", answer: `About ${n(hpToKw(3, "mechanical"), 2)} kW.` },
      { question: "Does a 1 HP motor use 746 W of electricity?", answer: "No. 746 W is the output. A typical motor draws more, depending on efficiency, so input is roughly 830 W at 90% efficiency." },
    ],
    related: ["kw-to-hp-calculator", "kw-to-amps-calculator", "breaker-size-calculator", "electricity-cost-calculator"],
  },
  {
    slug: "electricity-cost-calculator",
    title: "Electricity Cost Calculator",
    metaTitle: "Electricity Cost Calculator | Appliance kWh & Monthly Bill",
    metaDescription: "Calculate what any appliance costs to run per day, month and year. Enter watts, hours and your electricity rate. Works in any currency, with typical appliance examples.",
    eyebrow: "Watts × hours × rate",
    intro: "Find out how much an appliance costs to run. Enter its power, how long it runs each day and your electricity rate per kWh, in any currency.",
    tool: { kind: "cost" },
    formulas: {
      heading: "Electricity cost formulas",
      lines: ["Energy (kWh) = power (W) × hours ÷ 1000", "Cost = energy (kWh) × rate per kWh", "Monthly cost = daily kWh × days × rate"],
    },
    example: {
      heading: "Worked example: a 1,500 W air conditioner for 8 hours a day",
      body: `Daily energy = 1,500 × 8 ÷ 1000 = ${n(cost.kwhPerDay)} kWh. Over 30 days that is ${n(cost.kwhPerMonth)} kWh. At 0.15 per kWh the cost is ${n(cost.costPerMonth, 2)} per month, or ${n(cost.costPerYear, 0)} per year.`,
    },
    sections: [
      {
        heading: "Finding the real power of an appliance",
        paragraphs: [
          "The label shows the maximum or rated power. Appliances with a thermostat, such as refrigerators and air conditioners, cycle on and off, so their average draw is lower than the label. A plug-in energy meter gives the real kWh over a day or week, which is the most accurate input.",
          "To find your rate, divide your bill by the units (kWh) used. Include fixed charges only if you want the full cost of using the appliance, otherwise use the variable per-kWh rate.",
        ],
      },
      {
        heading: "Ways to reduce the cost",
        paragraphs: ["The biggest savings come from the largest loads: air conditioning, water heating and cooking. Raising an AC thermostat setting, using inverter-type AC and refrigeration, switching to LED lighting and running heavy appliances at off-peak rates all reduce kWh or the rate. Rooftop solar can offset daytime loads."],
      },
    ],
    tables: [{ kind: "appliances" }],
    faqs: [
      { question: "How do I calculate the cost of running an appliance?", answer: "Multiply watts by hours of use and divide by 1000 to get kWh, then multiply by your rate per kWh." },
      { question: "How much does it cost to run a 100 W device all day?", answer: `100 W for 24 hours is 2.4 kWh per day. At 0.15 per kWh that is 0.36 per day, about ${n(2.4 * 30 * 0.15, 2)} per month.` },
      { question: "What is a kWh?", answer: "A kilowatt-hour is the energy used by a 1,000 W load running for one hour. It is the unit on your electricity bill." },
      { question: "Why is my bill higher than the calculation?", answer: "Bills include fixed charges, taxes, fuel adjustments and tiered rates that rise with usage. Use your marginal rate for the most realistic estimate." },
    ],
    related: ["watts-to-kwh-calculator", "kw-to-amps-calculator", "ohms-law-calculator", "kw-to-hp-calculator"],
  },
  {
    slug: "watts-to-kwh-calculator",
    title: "Watts to kWh Calculator",
    metaTitle: "Watts to kWh Calculator | Energy Used Over Time",
    metaDescription: "Convert watts to kWh for any time period. Free calculator with the formula, example and a table showing kWh per hour, day and month for common wattages.",
    eyebrow: "Power → energy",
    intro: "Watts measure power at an instant. Kilowatt-hours measure energy over time. Enter watts and hours to see how many kWh a device uses.",
    tool: { kind: "cost", unit: "kwh" },
    formulas: { heading: "Watts to kWh formula", lines: ["kWh = watts × hours ÷ 1000", "kWh per month = watts × hours per day × days ÷ 1000"] },
    example: {
      heading: "Worked example: a 100 W television for 5 hours a day",
      body: `Daily energy = 100 × 5 ÷ 1000 = ${n(wk.kwhPerDay)} kWh. Over 30 days that is ${n(wk.kwhPerMonth)} kWh, and over a year ${n(wk.kwhPerYear, 0)} kWh.`,
    },
    sections: [
      {
        heading: "Why you cannot convert watts to kWh without time",
        paragraphs: ["A watt is a rate, like kilometres per hour. A kilowatt-hour is an amount, like kilometres travelled. You need the duration to turn one into the other: 1,000 W for one hour is 1 kWh, and so is 100 W for ten hours."],
      },
      {
        heading: "Using it for solar and batteries",
        paragraphs: ["The same conversion sizes batteries and solar arrays. Add up watts × hours for every appliance to get daily kWh, then compare that with what your panels produce and your battery stores. The solar calculator on this site builds on this energy total."],
      },
    ],
    tables: [{ kind: "watts-kwh" }],
    faqs: [
      { question: "How many kWh is 1000 watts?", answer: "1,000 W running for one hour uses 1 kWh." },
      { question: "How many kWh does a 60 W bulb use in a day?", answer: "Left on for 24 hours it uses 1.44 kWh. For 5 hours it uses 0.3 kWh." },
      { question: "How do I convert watt-hours to kWh?", answer: "Divide by 1,000. 2,500 Wh is 2.5 kWh." },
      { question: "Is kW the same as kWh?", answer: "No. kW is power, kWh is energy. A 2 kW heater running for 3 hours uses 6 kWh." },
    ],
    related: ["electricity-cost-calculator", "amps-to-watts-calculator", "kw-to-amps-calculator", "ohms-law-calculator"],
  },
  {
    slug: "power-factor-correction-calculator",
    title: "Power Factor Correction Calculator",
    metaTitle: "Power Factor Correction Calculator | Capacitor kVAR Size",
    metaDescription: "Calculate the capacitor bank size (kVAR) needed to raise power factor. Enter kW, existing and target PF to get kvar, kVA reduction and current saving.",
    eyebrow: "Capacitor kVAR sizing",
    intro: "Find the capacitor bank, in kilovars, needed to raise your power factor to a target value, and see how much apparent power and current you save.",
    tool: { kind: "pfc" },
    formulas: {
      heading: "Power factor correction formula",
      lines: ["Q (kvar) = P (kW) × (tan φ₁ − tan φ₂)", "φ = arccos(power factor)", "kVA = kW ÷ PF"],
      note: "φ₁ is the angle at the existing power factor and φ₂ at the target.",
    },
    example: {
      heading: "Worked example: 100 kW at PF 0.70 raised to 0.95",
      body: `Existing reactive power is ${n(pfc.kvarBefore)} kvar and at PF 0.95 it is ${n(pfc.kvarAfter)} kvar, so the capacitor bank needs ${n(pfc.capacitorKvar)} kvar. Apparent power falls from ${n(pfc.kvaBefore)} kVA to ${n(pfc.kvaAfter)} kVA, a current reduction of ${n(pfc.currentReductionPct, 1)}%.`,
    },
    sections: [
      {
        heading: "Why power factor matters",
        paragraphs: [
          "Inductive loads such as motors, transformers and fluorescent ballasts draw reactive current that does no useful work but still loads cables, transformers and generators. Many utilities add a penalty below about 0.9 to 0.95.",
          "Correcting power factor with capacitors supplies the reactive power locally. The result is lower current, lower I²R losses, less voltage drop and freed-up capacity, which can avoid a transformer or cable upgrade.",
        ],
      },
      {
        heading: "Practical cautions",
        paragraphs: ["Do not size capacitors for the full connected load if the load varies; use an automatic bank with stages. In systems with significant harmonics (drives, UPS, LED lighting), capacitors can resonate, so detuned reactors may be needed. Aim for 0.95 rather than 1.0 to avoid over-correction at light load. Have the bank specified by a qualified engineer."],
      },
    ],
    tables: [{ kind: "pfc" }],
    faqs: [
      { question: "How do I calculate capacitor kVAR for power factor correction?", answer: "kvar = kW × (tan φ₁ − tan φ₂) where φ = arccos(PF). For 100 kW from 0.7 to 0.95 this is about 69 kvar." },
      { question: "What power factor should I aim for?", answer: "0.95 is a common target. Many utilities penalise below 0.9 or 0.95. Avoid aiming for exactly 1.0 because load changes can lead to leading power factor." },
      { question: "Does power factor correction save kWh?", answer: "It reduces losses in the supply cables and transformers, which saves a small amount of energy. The main savings are avoided utility penalties and freed capacity." },
      { question: "What is the difference between kW, kVA and kvar?", answer: "kW is real power, kvar is reactive power and kVA is the vector total: kVA² = kW² + kvar²." },
    ],
    related: ["kw-to-kva-calculator", "kva-to-kw-calculator", "amps-to-kw-calculator", "va-to-watts-calculator"],
  },
];

export const quickToolBySlug = (slug: string) => QUICK_TOOLS.find((t) => t.slug === slug);

/** Existing static pages that can also be linked from `related`. */
export const EXISTING_ELECTRICAL_LINKS: Record<string, string> = {
  "wire-size-calculator": "Wire Size Calculator",
  "voltage-drop-calculator": "Voltage Drop Calculator",
};
