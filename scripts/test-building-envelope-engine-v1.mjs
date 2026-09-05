import assert from "node:assert/strict";
import {
  AIR_HEAT_CAPACITY_WH_PER_M3K,
  calculateAssembly,
  calculateHeatLoss,
  calculateInsulationQuantity,
  calculateRetrofit,
  defaultSurfaceResistance,
  layerResistance,
  rsiToRUs,
  rsiToUValue,
  rUsToRsi,
  uValueToRsi,
} from "../src/lib/building-envelope/envelope-engine.ts";

let passed = 0;
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected}, got ${actual}`);
  passed += 1;
};
const ok = (condition, label) => { assert.ok(condition, label); passed += 1; };
const throws = (fn, label) => { assert.throws(fn); passed += 1; console.log(`✓ ${label}`); };
const mark = (label) => console.log(`✓ ${label}`);

near(rUsToRsi(30), 30 / 5.678263337, 1e-12, "R-US to RSI"); mark("R-US to RSI");
near(rsiToRUs(5), 28.391316685, 1e-9, "RSI to R-US"); mark("RSI to R-US");
near(rsiToUValue(5), 0.2, 1e-12, "RSI to U"); mark("RSI to U");
near(uValueToRsi(0.25), 4, 1e-12, "U to RSI"); mark("U to RSI");
near(layerResistance({ id: "x", name: "Insulation", thicknessM: 0.1, conductivityWmK: 0.04 }), 2.5, 1e-12, "Layer R=t/lambda"); mark("Layer resistance");
near(layerResistance({ id: "x", name: "Declared R", directResistanceM2KPerW: 1.75 }), 1.75, 1e-12, "Direct layer R"); mark("Direct layer resistance override");

const wallSurface = defaultSurfaceResistance("wall");
near(wallSurface.insideM2KPerW, 0.13, 1e-12, "Wall Rsi"); mark("Wall default Rsi");
near(defaultSurfaceResistance("roof").insideM2KPerW, 0.10, 1e-12, "Roof Rsi"); mark("Roof default Rsi");
near(defaultSurfaceResistance("floor").insideM2KPerW, 0.17, 1e-12, "Floor Rsi"); mark("Floor default Rsi");

const assembly = calculateAssembly({
  orientation: "wall",
  layers: [{ id: "ins", name: "Insulation", thicknessM: 0.1, conductivityWmK: 0.04 }],
});
near(assembly.totalResistanceM2KPerW, 2.67, 1e-12, "Assembly total RSI"); mark("Assembly total RSI");
near(assembly.uValueWm2K, 1 / 2.67, 1e-12, "Assembly U"); mark("Assembly U-value");
near(assembly.totalRUs, rsiToRUs(2.67), 1e-9, "Assembly R-US"); mark("Assembly R-US");

const bridged = calculateAssembly({
  orientation: "wall",
  layers: [{ id: "ins", name: "Insulation", thicknessM: 0.1, conductivityWmK: 0.04 }],
  parallelBridge: { enabled: true, bridgeFraction: 0.15, bridgeLayerId: "ins", bridgeConductivityWmK: 0.13 },
});
ok(bridged.uValueWm2K > assembly.uValueWm2K, "Framing bridge increases U-value"); mark("Framing bridge increases U-value");
ok(bridged.totalResistanceM2KPerW < assembly.totalResistanceM2KPerW, "Framing bridge reduces effective R"); mark("Framing bridge reduces effective R");
ok(bridged.warnings.length > 0, "Bridge method warning present"); mark("Bridge warning");

const qty = calculateInsulationQuantity({
  areaM2: 100,
  existingResistanceM2KPerW: 1.5,
  targetResistanceM2KPerW: 5,
  conductivityWmK: 0.04,
  densityKgM3: 45,
  installationAllowancePercent: 5,
  packageMassKg: 20,
  packageCoverageM2: 10,
  packagePrice: 12,
});
near(qty.additionalResistanceM2KPerW, 3.5, 1e-12, "Added RSI"); mark("Insulation added RSI");
near(qty.requiredThicknessM, 0.14, 1e-12, "Required thickness"); mark("Insulation thickness");
near(qty.baseVolumeM3, 14, 1e-12, "Base volume"); mark("Insulation base volume");
near(qty.orderVolumeM3, 14.7, 1e-9, "Order volume"); mark("Ordering allowance volume");
near(qty.estimatedMassKg, 661.5, 1e-9, "Mass"); mark("Insulation mass");
ok(qty.packagesByMass === 34, "Mass package count rounds up"); mark("Mass packages round up");
ok(qty.packagesByCoverage === 11, "Coverage package count rounds up"); mark("Coverage packages round up");
near(qty.estimatedPackageCost, 132, 1e-12, "Package cost uses preferred coverage count"); mark("Package cost");

const noMore = calculateInsulationQuantity({ areaM2: 50, existingResistanceM2KPerW: 5, targetResistanceM2KPerW: 4, conductivityWmK: 0.04 });
near(noMore.requiredThicknessM, 0, 1e-12, "No negative thickness"); mark("No negative insulation thickness");
ok(noMore.warnings.some((w) => w.includes("already met")), "Already-met warning"); mark("Already-met warning");

near(AIR_HEAT_CAPACITY_WH_PER_M3K, 0.333, 1e-12, "Air heat capacity constant"); mark("Air heat-capacity constant");
const heat = calculateHeatLoss({
  indoorTemperatureC: 21,
  outdoorTemperatureC: -3,
  elements: [{ id: "wall", name: "Wall", areaM2: 100, uValueWm2K: 0.3 }],
  volumeM3: 300,
  infiltrationAirChangesPerHour: 0.5,
  heatRecoveryEfficiency: 0,
  heatingDegreeDaysC: 2500,
  heatingPerformanceFactor: 3,
  heatingEnergyPricePerKWh: 0.2,
  heatingCarbonKgPerKWh: 0.4,
});
near(heat.deltaTK, 24, 1e-12, "Delta T"); mark("Heat-loss delta T");
near(heat.fabricCoefficientWPerK, 30, 1e-12, "Fabric H"); mark("Fabric coefficient");
near(heat.ventilationCoefficientWPerK, 49.95, 1e-9, "Ventilation H"); mark("Ventilation coefficient");
near(heat.totalCoefficientWPerK, 79.95, 1e-9, "Total H"); mark("Total heat-loss coefficient");
near(heat.designHeatLossW, 1918.8, 1e-6, "Design heat loss"); mark("Design heat loss");
near(heat.annualHeatingDeliveredKWh, 4797, 1e-6, "Annual delivered heat"); mark("Annual HDD heat");
near(heat.annualHeatingInputKWh, 1599, 1e-6, "Annual input heat"); mark("System performance factor");
near(heat.annualEnergyCost, 319.8, 1e-6, "Annual heating cost"); mark("Annual cost");
near(heat.annualOperationalCarbonKg, 639.6, 1e-6, "Annual carbon"); mark("Annual operational carbon");

const recovered = calculateHeatLoss({
  indoorTemperatureC: 20,
  outdoorTemperatureC: 0,
  elements: [{ id: "wall", name: "Wall", areaM2: 50, uValueWm2K: 0.3 }],
  volumeM3: 200,
  ventilationAirChangesPerHour: 1,
  heatRecoveryEfficiency: 0.8,
});
near(recovered.ventilationCoefficientWPerK, 0.333 * 200 * 0.2, 1e-9, "Heat recovery"); mark("Heat recovery");

const mixedAir = calculateHeatLoss({
  indoorTemperatureC: 20,
  outdoorTemperatureC: 0,
  elements: [{ id: "wall", name: "Wall", areaM2: 50, uValueWm2K: 0.3 }],
  volumeM3: 200,
  infiltrationAirChangesPerHour: 0.5,
  ventilationAirChangesPerHour: 0.5,
  heatRecoveryEfficiency: 0.8,
});
near(mixedAir.infiltrationCoefficientWPerK, 0.333 * 200 * 0.5, 1e-9, "Infiltration unaffected by HRV"); mark("HRV does not reduce infiltration");
near(mixedAir.mechanicalVentilationCoefficientWPerK, 0.333 * 200 * 0.5 * 0.2, 1e-9, "Recovered mechanical ventilation"); mark("HRV applies only to ventilation");

const retrofit = calculateRetrofit({
  areaM2: 100,
  beforeUValueWm2K: 1.2,
  afterUValueWm2K: 0.25,
  heatingDegreeDaysC: 2500,
  heatingPerformanceFactor: 3,
  heatingEnergyPricePerKWh: 0.2,
  heatingCarbonKgPerKWh: 0.4,
  upgradeCost: 5000,
  embodiedCarbonKg: 500,
  analysisYears: 20,
});
near(retrofit.conductanceReductionWPerK, 95, 1e-12, "Retrofit delta H"); mark("Retrofit conductance reduction");
near(retrofit.annualHeatingDeliveredSavedKWh, 5700, 1e-6, "Retrofit delivered savings"); mark("Retrofit delivered savings");
near(retrofit.annualPurchasedEnergySavedKWh, 1900, 1e-6, "Retrofit purchased savings"); mark("Retrofit purchased-energy savings");
near(retrofit.annualCostSaving, 380, 1e-6, "Retrofit cost savings"); mark("Retrofit cost savings");
near(retrofit.annualCarbonSavingKg, 760, 1e-6, "Retrofit carbon savings"); mark("Retrofit carbon savings");
near(retrofit.financialPaybackYears, 5000 / 380, 1e-9, "Financial payback"); mark("Financial payback");
near(retrofit.carbonPaybackYears, 500 / 760, 1e-9, "Carbon payback"); mark("Carbon payback");
near(retrofit.netCarbonBenefitKg, 14700, 1e-6, "20-year net carbon"); mark("Net carbon benefit");

const epdRetrofit = calculateRetrofit({
  areaM2: 50,
  beforeUValueWm2K: 1,
  afterUValueWm2K: 0.3,
  heatingDegreeDaysC: 2000,
  heatingPerformanceFactor: 1,
  heatingCarbonKgPerKWh: 0.2,
  materialMassKg: 100,
  epdGwpKgCo2ePerKg: 1.5,
});
near(epdRetrofit.embodiedCarbonKg, 150, 1e-12, "EPD mass × factor"); mark("EPD embodied carbon");

throws(() => calculateAssembly({ orientation: "wall", layers: [] }), "Empty assembly rejected");
throws(() => layerResistance({ id: "x", name: "Bad", thicknessM: 0.1, conductivityWmK: 0 }), "Zero lambda rejected");
throws(() => calculateInsulationQuantity({ areaM2: -1, existingResistanceM2KPerW: 1, targetResistanceM2KPerW: 2, conductivityWmK: 0.04 }), "Negative area rejected");
throws(() => calculateHeatLoss({ indoorTemperatureC: 20, outdoorTemperatureC: 0, elements: [] }), "Heat loss requires element");
throws(() => calculateRetrofit({ areaM2: 100, beforeUValueWm2K: 0, afterUValueWm2K: 0.2 }), "Zero U-value rejected");
throws(() => calculateHeatLoss({ indoorTemperatureC: 20, outdoorTemperatureC: 0, elements: [{ id: "x", name: "Bad", areaM2: 10, uValueWm2K: 0 }] }), "Zero fabric U rejected");
throws(() => calculateHeatLoss({ indoorTemperatureC: 20, outdoorTemperatureC: 0, elements: [{ id: "x", name: "Bad", areaM2: 10, uValueWm2K: 0.3 }], heatRecoveryEfficiency: 1.2 }), "Heat recovery over 100% rejected");
throws(() => calculateHeatLoss({ indoorTemperatureC: 20, outdoorTemperatureC: 0, elements: [{ id: "x", name: "Bad", areaM2: 10, uValueWm2K: 0.3 }], heatingPerformanceFactor: 0 }), "Zero heating performance factor rejected");
throws(() => calculateInsulationQuantity({ areaM2: 10, existingResistanceM2KPerW: 1, targetResistanceM2KPerW: 2, conductivityWmK: 0.04, installationAllowancePercent: -1 }), "Negative allowance rejected");
throws(() => calculateRetrofit({ areaM2: 10, beforeUValueWm2K: 1, afterUValueWm2K: 0.2, upgradeCost: -1 }), "Negative upgrade cost rejected");

console.log(`\n${passed}/${passed} engine checks passed.`);
