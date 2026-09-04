import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch {
  console.error("TypeScript is required to run this regression test. Run npm install first.");
  process.exit(1);
}
const source = fs.readFileSync("src/lib/electrical-engine.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;

const module = { exports: {} };
const context = vm.createContext({ module, exports: module.exports, require, console, Math });
vm.runInContext(compiled, context, { filename: "electrical-engine.js" });
const e = module.exports;

let passed = 0;
let failed = 0;
const approx = (actual, expected, tol, name) => {
  const ok = Math.abs(actual - expected) <= tol;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${actual} (expected ${expected} ± ${tol})`);
  ok ? passed++ : failed++;
};
const truth = (condition, name) => {
  const ok = Boolean(condition);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  ok ? passed++ : failed++;
};

const base = e.defaultElectricalInput();

// 1) DC current from active power.
const dcLoad = e.calculateLoadElectricalValues({
  circuitType: "dc",
  inputMode: "kw",
  loadValue: 5,
  voltage: 48,
  powerFactor: 1,
});
approx(dcLoad.currentA, 104.1666667, 0.0001, "5 kW at 48 V DC current");

// 2) Single-phase current.
const sp = e.calculateLoadElectricalValues({
  circuitType: "single-phase",
  inputMode: "kw",
  loadValue: 5,
  voltage: 230,
  powerFactor: 0.9,
});
approx(sp.currentA, 24.1545894, 0.0001, "5 kW 230 V PF 0.9 single-phase current");

// 3) Three-phase current.
const tp = e.calculateLoadElectricalValues({
  circuitType: "three-phase",
  inputMode: "kw",
  loadValue: 7.5,
  voltage: 400,
  powerFactor: 0.85,
});
approx(tp.currentA, 12.7356677, 0.0002, "7.5 kW 400 V PF 0.85 three-phase current");

// 4) AWG geometry sanity.
approx(e.awgAreaMm2(12), 3.3088, 0.01, "12 AWG cross-sectional area");

// 5) Copper resistance at 75 C for 35 mm2.
const r35 = e.resistanceOhmPerKm({ material: "copper", areaMm2: 35, conductorTemperatureC: 75 });
approx(r35, 0.59915, 0.002, "35 mm2 copper resistance at 75 C");

// 6) DC battery cable voltage drop.
const batteryInput = {
  ...base,
  calculationMode: "voltage-drop",
  circuitType: "dc",
  inputMode: "kw",
  loadValue: 5,
  voltage: 48,
  powerFactor: 1,
  length: 2,
  lengthUnit: "m",
  material: "copper",
  conductorTemperatureC: 75,
  targetVoltageDropPct: 1,
  conductorSystem: "metric",
  selectedConductorId: "mm2-35",
  parallelRuns: 1,
  reactanceOhmPerKm: 0,
};
const battery = e.calculateElectrical(batteryInput);
approx(battery.selected.voltageDropPct, 0.52, 0.02, "48 V battery cable voltage-drop percent");
truth(battery.selected.receivingVoltageV < 48 && battery.selected.receivingVoltageV > 47, "Receiving voltage is reduced but plausible");

// 7) Wire size recommendation should be 25 mm2 for the controlled battery case.
const batterySize = e.calculateElectrical({ ...batteryInput, calculationMode: "wire-size" });
truth(batterySize.recommended?.conductor.id === "mm2-25", "Battery case recommends 25 mm2 by 1% voltage-drop target");

// 8) Parallel conductors reduce voltage drop approximately by half.
const parallel = e.calculateElectrical({ ...batteryInput, parallelRuns: 2 });
approx(parallel.selected.voltageDropV, battery.selected.voltageDropV / 2, 1e-9, "Two parallels halve resistive voltage drop");

// 9) Aluminum has higher resistance/drop than copper at equal area.
const aluminum = e.calculateElectrical({ ...batteryInput, material: "aluminum" });
truth(aluminum.selected.voltageDropV > battery.selected.voltageDropV, "Aluminum equal-area drop exceeds copper");

// 10) Max length inversion should reproduce target drop.
const maxLengthM = battery.selected.maxLengthMAtTarget;
truth(maxLengthM !== null && maxLengthM > batteryInput.length, "Max length is longer than controlled 2 m run");
if (maxLengthM !== null) {
  const atMax = e.calculateElectrical({ ...batteryInput, length: maxLengthM, lengthUnit: "m" });
  approx(atMax.selected.voltageDropPct, 1, 0.00001, "Max-length inverse returns the target drop");
}

// 11) Manufacturer resistance override must be used directly.
const overridden = e.calculateElectrical({ ...batteryInput, resistanceOverrideOhmPerKm: 0.2 });
approx(overridden.selected.resistanceOhmPerKm, 0.2, 1e-12, "Manufacturer resistance override");

// 12) Three-phase loss uses 3 conductors and remains positive.
const motor = e.calculateElectrical({
  ...base,
  calculationMode: "voltage-drop",
  circuitType: "three-phase",
  inputMode: "kw",
  loadValue: 7.5,
  voltage: 400,
  powerFactor: 0.85,
  length: 30,
  selectedConductorId: "mm2-6",
  reactanceOhmPerKm: 0.08,
});
truth(motor.selected.powerLossW > 0 && motor.selected.voltageDropPct > 0, "Three-phase voltage drop and power loss are positive");

// 13) Optional user ampacity check fails closed when design current exceeds supplied ampacity.
const ampacityFail = e.calculateElectrical({ ...batteryInput, cableAmpacityA: 90 });
truth(ampacityFail.selected.ampacityPass === false, "User-supplied ampacity check fails when current exceeds ampacity");

// 14) No universal ampacity is invented.
truth(battery.warnings.some((w) => w.includes("No thermal ampacity")), "Missing ampacity warning is present");

// 15) Design-current multiplier affects sizing/drop target but not operating I²R loss.
const dm1 = e.calculateElectrical({ ...batteryInput, calculationMode: "wire-size", designCurrentMultiplier: 1 });
const dm125 = e.calculateElectrical({ ...batteryInput, calculationMode: "wire-size", designCurrentMultiplier: 1.25 });
truth(dm125.designCurrentA > dm1.designCurrentA, "Design-current multiplier increases design current");
approx(dm125.selected.powerLossW, dm1.selected.powerLossW, 1e-9, "Design multiplier does not inflate operating cable loss");

// 16) Max-current inverse should land on the target voltage drop.
const maxCurrent = battery.selected.maxCurrentAAtTarget;
truth(maxCurrent !== null && maxCurrent > battery.load.currentA, "Max current at target is above controlled operating current");
if (maxCurrent !== null) {
  const maxCurrentCase = e.calculateElectrical({ ...batteryInput, inputMode: "amps", loadValue: maxCurrent });
  approx(maxCurrentCase.selected.voltageDropPct, 1, 0.00001, "Max-current inverse returns target voltage drop");
}

// 17) Annual loss energy is loss watts × hours × 365 / 1000.
approx(
  battery.selected.annualLossKWh,
  battery.selected.powerLossW * batteryInput.operatingHoursPerDay * 365 / 1000,
  1e-9,
  "Annual cable-loss energy relation"
);

// 18) Cost is annual loss × tariff.
approx(
  battery.selected.annualLossCost,
  battery.selected.annualLossKWh * batteryInput.energyCostPerKWh,
  1e-9,
  "Annual cable-loss cost relation"
);

// 19) Single-phase voltage drop uses outgoing and return conductor.
const spDrop = e.calculateElectrical({
  ...base, calculationMode: "voltage-drop", circuitType: "single-phase", inputMode: "amps",
  loadValue: 10, voltage: 230, powerFactor: 1, length: 100, lengthUnit: "m",
  selectedConductorId: "mm2-10", conductorTemperatureC: 20, reactanceOhmPerKm: 0
});
const r10 = e.resistanceOhmPerKm({ material: "copper", areaMm2: 10, conductorTemperatureC: 20 });
approx(spDrop.selected.voltageDropV, 2 * 10 * 0.1 * r10, 1e-9, "Single-phase two-conductor path factor");

// 20) Three-phase kVA conversion.
const kva3 = e.calculateLoadElectricalValues({ circuitType: "three-phase", inputMode: "kva", loadValue: 100, voltage: 400, powerFactor: 0.8 });
approx(kva3.currentA, 100000 / (Math.sqrt(3) * 400), 1e-9, "100 kVA 400 V three-phase current");

// 21) Cross-system equivalent is available.
truth(Boolean(battery.selected.equivalentConductor), "Cross-system AWG/mm2 equivalent is returned");

// 22) Normalization rejects a mismatched selected-conductor system.
const normalized = e.normalizeElectricalInput({ ...base, conductorSystem: "metric", selectedConductorId: "awg-8" });
truth(normalized.selectedConductorId.startsWith("mm2-"), "Mismatched conductor system is normalized safely");

console.log(`\n${passed}/${passed + failed} engine checks passed.`);
if (failed) process.exit(1);
