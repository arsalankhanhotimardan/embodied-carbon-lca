/**
 * Green Engineering Tools — Building Envelope Engine v1.0.0
 * Pure calculation module. No React, DOM, network or database dependencies.
 *
 * Scope:
 * - R-US / RSI / U-value conversion
 * - Homogeneous multilayer thermal resistance
 * - Simple repeated-framing parallel-path approximation
 * - Insulation thickness / quantity planning
 * - Steady-state fabric + ventilation heat loss
 * - HDD/CDD annual envelope-energy estimate
 * - Financial and carbon payback planning
 *
 * Important: this is an engineering planning engine, not a code-compliance
 * certification engine. Local codes, product declarations, thermal bridges,
 * moisture/condensation, ground heat transfer, windows/doors and specialist
 * details may require separate methods.
 */

export const ENVELOPE_ENGINE_VERSION = "1.0.0";
export const R_US_PER_RSI = 5.678263337;
export const W_TO_BTU_PER_HR = 3.412141633;
export const AIR_HEAT_CAPACITY_WH_PER_M3K = 0.333; // planning constant ≈ ρ·cp / 3600

export type ElementOrientation = "wall" | "roof" | "floor" | "custom";

export type ThermalLayer = {
  id: string;
  name: string;
  thicknessM?: number | null;
  conductivityWmK?: number | null;
  directResistanceM2KPerW?: number | null;
};

export type SurfaceResistance = {
  insideM2KPerW: number;
  outsideM2KPerW: number;
};

export type ParallelBridgeInput = {
  enabled: boolean;
  bridgeFraction: number; // 0..1
  bridgeLayerId: string;
  bridgeConductivityWmK: number;
};

export type AssemblyInput = {
  orientation: ElementOrientation;
  layers: ThermalLayer[];
  surfaceResistance?: SurfaceResistance;
  parallelBridge?: ParallelBridgeInput | null;
};

export type LayerResult = ThermalLayer & {
  resistanceM2KPerW: number;
};

export type AssemblyResult = {
  totalResistanceM2KPerW: number;
  totalRUs: number;
  uValueWm2K: number;
  layerResults: LayerResult[];
  surfaceResistance: SurfaceResistance;
  parallelPath?: {
    bridgeFraction: number;
    insulatedPathResistanceM2KPerW: number;
    bridgePathResistanceM2KPerW: number;
    effectiveUValueWm2K: number;
  } | null;
  warnings: string[];
};

export type InsulationQuantityInput = {
  areaM2: number;
  existingResistanceM2KPerW: number;
  targetResistanceM2KPerW: number;
  conductivityWmK: number;
  densityKgM3?: number | null;
  installationAllowancePercent?: number;
  packageMassKg?: number | null;
  packageCoverageM2?: number | null;
  packagePrice?: number | null;
};

export type InsulationQuantityResult = {
  additionalResistanceM2KPerW: number;
  requiredThicknessM: number;
  baseVolumeM3: number;
  orderVolumeM3: number;
  estimatedMassKg: number | null;
  packagesByMass: number | null;
  packagesByCoverage: number | null;
  estimatedPackageCost: number | null;
  warnings: string[];
};

export type FabricElementInput = {
  id: string;
  name: string;
  areaM2: number;
  uValueWm2K: number;
};

export type HeatLossInput = {
  indoorTemperatureC: number;
  outdoorTemperatureC: number;
  elements: FabricElementInput[];
  volumeM3?: number | null;
  infiltrationAirChangesPerHour?: number | null; // uncontrolled air leakage / infiltration
  ventilationAirChangesPerHour?: number | null; // intentional/mechanical ventilation
  heatRecoveryEfficiency?: number | null; // 0..1, applied only to ventilation ACH
  designMarginPercent?: number;
  heatingDegreeDaysC?: number | null;
  coolingDegreeDaysC?: number | null;
  heatingPerformanceFactor?: number | null; // efficiency or COP
  coolingPerformanceFactor?: number | null; // COP/EER-like ratio on delivered-energy basis
  heatingEnergyPricePerKWh?: number | null;
  coolingEnergyPricePerKWh?: number | null;
  heatingCarbonKgPerKWh?: number | null;
  coolingCarbonKgPerKWh?: number | null;
};

export type HeatLossResult = {
  deltaTK: number;
  fabricCoefficientWPerK: number;
  infiltrationCoefficientWPerK: number;
  mechanicalVentilationCoefficientWPerK: number;
  ventilationCoefficientWPerK: number;
  totalCoefficientWPerK: number;
  fabricHeatLossW: number;
  infiltrationHeatLossW: number;
  mechanicalVentilationHeatLossW: number;
  ventilationHeatLossW: number;
  subtotalHeatLossW: number;
  designHeatLossW: number;
  designHeatLossBtuPerHr: number;
  annualHeatingDeliveredKWh: number | null;
  annualCoolingDeliveredKWh: number | null;
  annualHeatingInputKWh: number | null;
  annualCoolingInputKWh: number | null;
  annualEnergyCost: number | null;
  annualOperationalCarbonKg: number | null;
  warnings: string[];
};

export type RetrofitInput = {
  areaM2: number;
  beforeUValueWm2K: number;
  afterUValueWm2K: number;
  heatingDegreeDaysC?: number | null;
  coolingDegreeDaysC?: number | null;
  heatingPerformanceFactor?: number | null;
  coolingPerformanceFactor?: number | null;
  heatingEnergyPricePerKWh?: number | null;
  coolingEnergyPricePerKWh?: number | null;
  heatingCarbonKgPerKWh?: number | null;
  coolingCarbonKgPerKWh?: number | null;
  upgradeCost?: number | null;
  embodiedCarbonKg?: number | null;
  materialMassKg?: number | null;
  epdGwpKgCo2ePerKg?: number | null;
  analysisYears?: number;
};

export type RetrofitResult = {
  conductanceReductionWPerK: number;
  annualHeatingDeliveredSavedKWh: number | null;
  annualCoolingDeliveredSavedKWh: number | null;
  annualPurchasedEnergySavedKWh: number | null;
  annualCostSaving: number | null;
  annualCarbonSavingKg: number | null;
  embodiedCarbonKg: number | null;
  financialPaybackYears: number | null;
  carbonPaybackYears: number | null;
  netCarbonBenefitKg: number | null;
  warnings: string[];
};

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const nonNegative = (value: number, name: string) => {
  if (!finite(value) || value < 0) throw new Error(`${name} must be a finite non-negative number.`);
};

const positive = (value: number, name: string) => {
  if (!finite(value) || value <= 0) throw new Error(`${name} must be greater than zero.`);
};

const optionalNonNegative = (value: number | null | undefined, name: string) => {
  if (value == null) return;
  nonNegative(value, name);
};

const optionalPositive = (value: number | null | undefined, name: string) => {
  if (value == null) return;
  positive(value, name);
};

const optionalFraction = (value: number | null | undefined, name: string) => {
  if (value == null) return;
  if (!finite(value) || value < 0 || value > 1) throw new Error(`${name} must be between 0 and 1.`);
};

export function rUsToRsi(rUs: number): number {
  nonNegative(rUs, "R-value");
  return rUs / R_US_PER_RSI;
}

export function rsiToRUs(rsi: number): number {
  nonNegative(rsi, "RSI");
  return rsi * R_US_PER_RSI;
}

export function rsiToUValue(rsi: number): number {
  positive(rsi, "RSI");
  return 1 / rsi;
}

export function uValueToRsi(uValue: number): number {
  positive(uValue, "U-value");
  return 1 / uValue;
}

export function defaultSurfaceResistance(orientation: ElementOrientation): SurfaceResistance {
  switch (orientation) {
    case "roof":
      return { insideM2KPerW: 0.10, outsideM2KPerW: 0.04 };
    case "floor":
      return { insideM2KPerW: 0.17, outsideM2KPerW: 0.04 };
    case "wall":
    default:
      return { insideM2KPerW: 0.13, outsideM2KPerW: 0.04 };
  }
}

export function layerResistance(layer: ThermalLayer): number {
  if (finite(layer.directResistanceM2KPerW) && (layer.directResistanceM2KPerW as number) > 0) {
    return layer.directResistanceM2KPerW as number;
  }
  const t = Number(layer.thicknessM);
  const lambda = Number(layer.conductivityWmK);
  positive(t, `${layer.name || "Layer"} thickness`);
  positive(lambda, `${layer.name || "Layer"} conductivity`);
  return t / lambda;
}

export function calculateAssembly(input: AssemblyInput): AssemblyResult {
  if (!Array.isArray(input.layers) || input.layers.length === 0) {
    throw new Error("At least one thermal layer is required.");
  }

  const surface = input.surfaceResistance ?? defaultSurfaceResistance(input.orientation);
  nonNegative(surface.insideM2KPerW, "Inside surface resistance");
  nonNegative(surface.outsideM2KPerW, "Outside surface resistance");

  const layerResults = input.layers.map((layer) => ({
    ...layer,
    resistanceM2KPerW: layerResistance(layer),
  }));

  const baseR = surface.insideM2KPerW + surface.outsideM2KPerW +
    layerResults.reduce((sum, layer) => sum + layer.resistanceM2KPerW, 0);
  positive(baseR, "Total thermal resistance");

  const warnings: string[] = [];
  let totalR = baseR;
  let parallelPath: AssemblyResult["parallelPath"] = null;

  if (input.parallelBridge?.enabled) {
    const bridge = input.parallelBridge;
    if (!finite(bridge.bridgeFraction) || bridge.bridgeFraction <= 0 || bridge.bridgeFraction >= 1) {
      throw new Error("Bridge fraction must be greater than 0 and less than 1.");
    }
    positive(bridge.bridgeConductivityWmK, "Bridge conductivity");

    const target = input.layers.find((layer) => layer.id === bridge.bridgeLayerId);
    if (!target) throw new Error("The selected bridge layer was not found.");
    const targetThickness = Number(target.thicknessM);
    positive(targetThickness, "Bridge-layer thickness");

    const insulatedTargetR = layerResistance(target);
    const bridgeTargetR = targetThickness / bridge.bridgeConductivityWmK;
    const bridgePathR = baseR - insulatedTargetR + bridgeTargetR;
    positive(bridgePathR, "Bridge-path resistance");

    const f = bridge.bridgeFraction;
    const effectiveU = (1 - f) / baseR + f / bridgePathR;
    totalR = 1 / effectiveU;
    parallelPath = {
      bridgeFraction: f,
      insulatedPathResistanceM2KPerW: baseR,
      bridgePathResistanceM2KPerW: bridgePathR,
      effectiveUValueWm2K: effectiveU,
    };
    warnings.push(
      "Repeating framing is estimated with a simple parallel-path model. Point/linear thermal bridges, junction Ψ-values and complex inhomogeneous layers require a specialist method."
    );
  }

  const u = 1 / totalR;
  return {
    totalResistanceM2KPerW: totalR,
    totalRUs: rsiToRUs(totalR),
    uValueWm2K: u,
    layerResults,
    surfaceResistance: surface,
    parallelPath,
    warnings,
  };
}

export function calculateInsulationQuantity(input: InsulationQuantityInput): InsulationQuantityResult {
  positive(input.areaM2, "Area");
  nonNegative(input.existingResistanceM2KPerW, "Existing resistance");
  positive(input.targetResistanceM2KPerW, "Target resistance");
  positive(input.conductivityWmK, "Insulation conductivity");
  optionalPositive(input.densityKgM3, "Installed density");
  optionalPositive(input.packageMassKg, "Package mass");
  optionalPositive(input.packageCoverageM2, "Package coverage");
  optionalNonNegative(input.packagePrice, "Package price");
  optionalNonNegative(input.installationAllowancePercent, "Installation / ordering allowance");
  if ((input.installationAllowancePercent ?? 0) > 100) throw new Error("Installation / ordering allowance must not exceed 100%.");

  const allowance = Number(input.installationAllowancePercent ?? 0) / 100;
  const additionalR = Math.max(0, input.targetResistanceM2KPerW - input.existingResistanceM2KPerW);
  const baseThickness = additionalR * input.conductivityWmK;
  // The allowance is an ordering/waste allowance, not an instruction to install
  // extra thickness. Installed thickness remains governed by the target R/RSI and
  // declared conductivity; additional material quantity is handled in volume.
  const baseVolume = input.areaM2 * baseThickness;
  const orderVolume = baseVolume * (1 + allowance);

  let mass: number | null = null;
  if (finite(input.densityKgM3) && (input.densityKgM3 as number) > 0) {
    mass = orderVolume * (input.densityKgM3 as number);
  }

  let packagesByMass: number | null = null;
  if (mass !== null && finite(input.packageMassKg) && (input.packageMassKg as number) > 0) {
    packagesByMass = Math.ceil(mass / (input.packageMassKg as number));
  }

  let packagesByCoverage: number | null = null;
  if (finite(input.packageCoverageM2) && (input.packageCoverageM2 as number) > 0) {
    packagesByCoverage = Math.ceil(input.areaM2 * (1 + allowance) / (input.packageCoverageM2 as number));
  }

  const chosenPackages = packagesByCoverage ?? packagesByMass;
  const estimatedPackageCost =
    chosenPackages !== null && finite(input.packagePrice) && (input.packagePrice as number) >= 0
      ? chosenPackages * (input.packagePrice as number)
      : null;

  const warnings: string[] = [];
  if (additionalR === 0) warnings.push("The target thermal resistance is already met or exceeded by the entered existing resistance.");
  if (packagesByCoverage === null && packagesByMass === null) {
    warnings.push("Package count is unavailable until product-specific package coverage or package mass data is entered.");
  }
  warnings.push("Use the selected product's declared thermal conductivity/R-value and coverage chart for purchase quantities; generic material presets are planning values only.");

  return {
    additionalResistanceM2KPerW: additionalR,
    requiredThicknessM: baseThickness,
    baseVolumeM3: baseVolume,
    orderVolumeM3: orderVolume,
    estimatedMassKg: mass,
    packagesByMass,
    packagesByCoverage,
    estimatedPackageCost,
    warnings,
  };
}

export function calculateHeatLoss(input: HeatLossInput): HeatLossResult {
  if (!Array.isArray(input.elements) || input.elements.length === 0) {
    throw new Error("At least one building-fabric element is required.");
  }
  if (!finite(input.indoorTemperatureC) || !finite(input.outdoorTemperatureC)) throw new Error("Indoor and outdoor design temperatures must be finite numbers.");
  const deltaT = Math.abs(input.indoorTemperatureC - input.outdoorTemperatureC);

  let fabricH = 0;
  for (const element of input.elements) {
    positive(element.areaM2, `${element.name || "Element"} area`);
    positive(element.uValueWm2K, `${element.name || "Element"} U-value`);
    fabricH += element.areaM2 * element.uValueWm2K;
  }

  optionalNonNegative(input.volumeM3, "Building volume");
  optionalNonNegative(input.infiltrationAirChangesPerHour, "Infiltration air changes per hour");
  optionalNonNegative(input.ventilationAirChangesPerHour, "Ventilation air changes per hour");
  optionalFraction(input.heatRecoveryEfficiency, "Heat-recovery efficiency");
  optionalNonNegative(input.designMarginPercent, "Design margin");
  if ((input.designMarginPercent ?? 0) > 100) throw new Error("Design margin must not exceed 100%.");
  optionalNonNegative(input.heatingDegreeDaysC, "Heating degree days");
  optionalNonNegative(input.coolingDegreeDaysC, "Cooling degree days");
  optionalPositive(input.heatingPerformanceFactor, "Heating performance factor");
  optionalPositive(input.coolingPerformanceFactor, "Cooling performance factor");
  optionalNonNegative(input.heatingEnergyPricePerKWh, "Heating energy price");
  optionalNonNegative(input.coolingEnergyPricePerKWh, "Cooling energy price");
  optionalNonNegative(input.heatingCarbonKgPerKWh, "Heating carbon factor");
  optionalNonNegative(input.coolingCarbonKgPerKWh, "Cooling carbon factor");

  const infiltrationAch = input.infiltrationAirChangesPerHour ?? 0;
  const ventilationAch = input.ventilationAirChangesPerHour ?? 0;
  const volume = input.volumeM3 ?? 0;
  const hrv = input.heatRecoveryEfficiency ?? 0;
  const infiltrationH = AIR_HEAT_CAPACITY_WH_PER_M3K * infiltrationAch * volume;
  const mechanicalVentilationH = AIR_HEAT_CAPACITY_WH_PER_M3K * ventilationAch * volume * (1 - hrv);
  const ventilationH = infiltrationH + mechanicalVentilationH;
  const totalH = fabricH + ventilationH;

  const fabricW = fabricH * deltaT;
  const infiltrationW = infiltrationH * deltaT;
  const mechanicalVentilationW = mechanicalVentilationH * deltaT;
  const ventilationW = infiltrationW + mechanicalVentilationW;
  const subtotal = fabricW + ventilationW;
  const margin = Number(input.designMarginPercent ?? 0) / 100;
  const designW = subtotal * (1 + margin);

  const annualDelivered = (degreeDays: number | null | undefined) => {
    if (!finite(degreeDays) || (degreeDays as number) < 0) return null;
    return totalH * (degreeDays as number) * 24 / 1000;
  };

  const annualHeatingDeliveredKWh = annualDelivered(input.heatingDegreeDaysC);
  const annualCoolingDeliveredKWh = annualDelivered(input.coolingDegreeDaysC);

  const inputEnergy = (delivered: number | null, factor: number | null | undefined) => {
    if (delivered === null) return null;
    if (!finite(factor) || (factor as number) <= 0) return null;
    return delivered / (factor as number);
  };

  const annualHeatingInputKWh = inputEnergy(annualHeatingDeliveredKWh, input.heatingPerformanceFactor);
  const annualCoolingInputKWh = inputEnergy(annualCoolingDeliveredKWh, input.coolingPerformanceFactor);

  const costParts: number[] = [];
  if (annualHeatingInputKWh !== null && finite(input.heatingEnergyPricePerKWh)) costParts.push(annualHeatingInputKWh * (input.heatingEnergyPricePerKWh as number));
  if (annualCoolingInputKWh !== null && finite(input.coolingEnergyPricePerKWh)) costParts.push(annualCoolingInputKWh * (input.coolingEnergyPricePerKWh as number));
  const annualEnergyCost = costParts.length ? costParts.reduce((a, b) => a + b, 0) : null;

  const carbonParts: number[] = [];
  if (annualHeatingInputKWh !== null && finite(input.heatingCarbonKgPerKWh)) carbonParts.push(annualHeatingInputKWh * (input.heatingCarbonKgPerKWh as number));
  if (annualCoolingInputKWh !== null && finite(input.coolingCarbonKgPerKWh)) carbonParts.push(annualCoolingInputKWh * (input.coolingCarbonKgPerKWh as number));
  const annualOperationalCarbonKg = carbonParts.length ? carbonParts.reduce((a, b) => a + b, 0) : null;

  const warnings: string[] = [];
  if (volume > 0 && infiltrationAch === 0 && ventilationAch === 0) warnings.push("Room/building volume was entered but both infiltration and ventilation ACH are zero, so air-exchange heat loss is not included.");
  if (hrv > 0 && ventilationAch === 0) warnings.push("Heat-recovery efficiency was entered but mechanical ventilation ACH is zero; heat recovery therefore has no effect.");
  if (margin > 0) warnings.push("The design margin is a user-selected planning allowance, not a substitute for a local HVAC sizing standard.");
  if (input.heatingDegreeDaysC != null || input.coolingDegreeDaysC != null) {
    warnings.push("Degree-day energy is a simplified steady-state envelope estimate. Solar gains, internal gains, humidity, dynamic thermal mass and controls are not modelled.");
  }

  return {
    deltaTK: deltaT,
    fabricCoefficientWPerK: fabricH,
    infiltrationCoefficientWPerK: infiltrationH,
    mechanicalVentilationCoefficientWPerK: mechanicalVentilationH,
    ventilationCoefficientWPerK: ventilationH,
    totalCoefficientWPerK: totalH,
    fabricHeatLossW: fabricW,
    infiltrationHeatLossW: infiltrationW,
    mechanicalVentilationHeatLossW: mechanicalVentilationW,
    ventilationHeatLossW: ventilationW,
    subtotalHeatLossW: subtotal,
    designHeatLossW: designW,
    designHeatLossBtuPerHr: designW * W_TO_BTU_PER_HR,
    annualHeatingDeliveredKWh,
    annualCoolingDeliveredKWh,
    annualHeatingInputKWh,
    annualCoolingInputKWh,
    annualEnergyCost,
    annualOperationalCarbonKg,
    warnings,
  };
}

export function calculateRetrofit(input: RetrofitInput): RetrofitResult {
  positive(input.areaM2, "Area");
  positive(input.beforeUValueWm2K, "Before U-value");
  positive(input.afterUValueWm2K, "After U-value");
  optionalNonNegative(input.heatingDegreeDaysC, "Heating degree days");
  optionalNonNegative(input.coolingDegreeDaysC, "Cooling degree days");
  optionalPositive(input.heatingPerformanceFactor, "Heating performance factor");
  optionalPositive(input.coolingPerformanceFactor, "Cooling performance factor");
  optionalNonNegative(input.heatingEnergyPricePerKWh, "Heating energy price");
  optionalNonNegative(input.coolingEnergyPricePerKWh, "Cooling energy price");
  optionalNonNegative(input.heatingCarbonKgPerKWh, "Heating carbon factor");
  optionalNonNegative(input.coolingCarbonKgPerKWh, "Cooling carbon factor");
  optionalNonNegative(input.upgradeCost, "Upgrade cost");
  optionalNonNegative(input.embodiedCarbonKg, "Embodied carbon");
  optionalNonNegative(input.materialMassKg, "Material mass");
  optionalNonNegative(input.epdGwpKgCo2ePerKg, "EPD GWP factor");
  optionalPositive(input.analysisYears, "Analysis period");

  const deltaU = Math.max(0, input.beforeUValueWm2K - input.afterUValueWm2K);
  const deltaH = deltaU * input.areaM2;

  const deliveredSaved = (dd: number | null | undefined) => {
    if (!finite(dd) || (dd as number) < 0) return null;
    return deltaH * (dd as number) * 24 / 1000;
  };
  const heatDelivered = deliveredSaved(input.heatingDegreeDaysC);
  const coolDelivered = deliveredSaved(input.coolingDegreeDaysC);

  const purchasedSaved = (delivered: number | null, factor: number | null | undefined) => {
    if (delivered === null || !finite(factor) || (factor as number) <= 0) return null;
    return delivered / (factor as number);
  };
  const heatPurchased = purchasedSaved(heatDelivered, input.heatingPerformanceFactor);
  const coolPurchased = purchasedSaved(coolDelivered, input.coolingPerformanceFactor);
  const purchasedParts = [heatPurchased, coolPurchased].filter((v): v is number => v !== null);
  const annualPurchasedEnergySavedKWh = purchasedParts.length ? purchasedParts.reduce((a, b) => a + b, 0) : null;

  const costParts: number[] = [];
  if (heatPurchased !== null && finite(input.heatingEnergyPricePerKWh)) costParts.push(heatPurchased * (input.heatingEnergyPricePerKWh as number));
  if (coolPurchased !== null && finite(input.coolingEnergyPricePerKWh)) costParts.push(coolPurchased * (input.coolingEnergyPricePerKWh as number));
  const annualCostSaving = costParts.length ? costParts.reduce((a, b) => a + b, 0) : null;

  const carbonParts: number[] = [];
  if (heatPurchased !== null && finite(input.heatingCarbonKgPerKWh)) carbonParts.push(heatPurchased * (input.heatingCarbonKgPerKWh as number));
  if (coolPurchased !== null && finite(input.coolingCarbonKgPerKWh)) carbonParts.push(coolPurchased * (input.coolingCarbonKgPerKWh as number));
  const annualCarbonSavingKg = carbonParts.length ? carbonParts.reduce((a, b) => a + b, 0) : null;

  let embodiedCarbonKg: number | null = null;
  if (finite(input.embodiedCarbonKg) && (input.embodiedCarbonKg as number) >= 0) {
    embodiedCarbonKg = input.embodiedCarbonKg as number;
  } else if (finite(input.materialMassKg) && (input.materialMassKg as number) >= 0 && finite(input.epdGwpKgCo2ePerKg) && (input.epdGwpKgCo2ePerKg as number) >= 0) {
    embodiedCarbonKg = (input.materialMassKg as number) * (input.epdGwpKgCo2ePerKg as number);
  }

  const financialPaybackYears =
    finite(input.upgradeCost) && (input.upgradeCost as number) >= 0 && annualCostSaving !== null && annualCostSaving > 0
      ? (input.upgradeCost as number) / annualCostSaving
      : null;

  const carbonPaybackYears =
    embodiedCarbonKg !== null && annualCarbonSavingKg !== null && annualCarbonSavingKg > 0
      ? embodiedCarbonKg / annualCarbonSavingKg
      : null;

  const years = finite(input.analysisYears) && (input.analysisYears as number) > 0 ? (input.analysisYears as number) : 20;
  const netCarbonBenefitKg =
    embodiedCarbonKg !== null && annualCarbonSavingKg !== null
      ? annualCarbonSavingKg * years - embodiedCarbonKg
      : null;

  const warnings: string[] = [];
  if (input.afterUValueWm2K >= input.beforeUValueWm2K) warnings.push("The entered after-retrofit U-value is not lower than the before-retrofit U-value, so calculated fabric savings are zero.");
  if (embodiedCarbonKg === null) warnings.push("Carbon payback is unavailable until product/project embodied carbon is entered, ideally from a verified EPD or LCA result.");
  if (annualCarbonSavingKg === null) warnings.push("Operational carbon savings are unavailable until the relevant energy carbon factor is entered.");
  warnings.push("Operational savings are planning estimates based on degree days and do not replace calibrated building-energy simulation or utility-bill analysis.");

  return {
    conductanceReductionWPerK: deltaH,
    annualHeatingDeliveredSavedKWh: heatDelivered,
    annualCoolingDeliveredSavedKWh: coolDelivered,
    annualPurchasedEnergySavedKWh,
    annualCostSaving,
    annualCarbonSavingKg,
    embodiedCarbonKg,
    financialPaybackYears,
    carbonPaybackYears,
    netCarbonBenefitKg,
    warnings,
  };
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}
