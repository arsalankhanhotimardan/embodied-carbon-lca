export const ELECTRICAL_ENGINE_VERSION = "Electrical-V1.0";

export type CircuitType = "dc" | "single-phase" | "three-phase";
export type LoadInputMode = "amps" | "watts" | "kw" | "kva";
export type ConductorMaterial = "copper" | "aluminum";
export type CalculationMode =
  | "wire-size"
  | "voltage-drop"
  | "max-length"
  | "max-current"
  | "power-loss";
export type ConductorSystem = "metric" | "awg";
export type LengthUnit = "m" | "ft";

export interface ConductorSize {
  id: string;
  label: string;
  mm2: number;
  system: ConductorSystem;
  sortOrder: number;
}

export interface ElectricalInput {
  calculationMode: CalculationMode;
  circuitType: CircuitType;
  inputMode: LoadInputMode;
  loadValue: number;
  voltage: number;
  powerFactor: number;
  length: number;
  lengthUnit: LengthUnit;
  material: ConductorMaterial;
  conductorTemperatureC: number;
  targetVoltageDropPct: number;
  conductorSystem: ConductorSystem;
  selectedConductorId: string;
  parallelRuns: number;
  designCurrentMultiplier: number;
  reactanceOhmPerKm: number;
  resistanceOverrideOhmPerKm: number | null;
  cableAmpacityA: number | null;
  operatingHoursPerDay: number;
  energyCostPerKWh: number;
  currencyCode: string;
}

export interface LoadElectricalValues {
  currentA: number;
  activePowerKw: number;
  apparentPowerKva: number;
  powerFactorUsed: number;
}

export interface ConductorCalculation {
  conductor: ConductorSize;
  equivalentConductor: ConductorSize | null;
  resistanceOhmPerKm: number;
  reactanceOhmPerKm: number;
  voltageDropV: number;
  voltageDropPct: number;
  receivingVoltageV: number;
  designVoltageDropV: number;
  designVoltageDropPct: number;
  powerLossW: number;
  powerLossPctOfActiveLoad: number | null;
  annualLossKWh: number;
  annualLossCost: number;
  maxLengthMAtTarget: number | null;
  maxCurrentAAtTarget: number | null;
  ampacityUtilizationPct: number | null;
  ampacityPass: boolean | null;
}

export interface ElectricalResult {
  engineVersion: string;
  input: ElectricalInput;
  load: LoadElectricalValues;
  designCurrentA: number;
  selected: ConductorCalculation;
  recommended: ConductorCalculation | null;
  governingConductor: ConductorCalculation;
  targetVoltageDropPct: number;
  warnings: string[];
  assumptions: string[];
}

const SQRT3 = Math.sqrt(3);
const FT_TO_M = 0.3048;
const KCMIL_TO_MM2 = 0.506707479;

/**
 * Reference DC resistivity constants at 20 °C.
 * Copper values are consistent with 100% IACS copper. Aluminum values are
 * consistent with 61% IACS conductor-grade aluminum.
 */
const MATERIAL: Record<
  ConductorMaterial,
  { rho20OhmMm2PerM: number; alpha20PerC: number; label: string }
> = {
  copper: {
    rho20OhmMm2PerM: 0.017241,
    alpha20PerC: 0.00393,
    label: "Copper",
  },
  aluminum: {
    rho20OhmMm2PerM: 0.028265,
    alpha20PerC: 0.00403,
    label: "Aluminum",
  },
};

const METRIC_MM2 = [
  0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150,
  185, 240, 300, 400, 500, 630,
];

const AWG_NUMBERS = [18, 16, 14, 12, 10, 8, 6, 4, 3, 2, 1, 0, -1, -2, -3];
const KCMIL_SIZES = [250, 300, 350, 400, 500, 600, 750, 1000];

const awgLabel = (n: number) => {
  if (n >= 1) return `${n} AWG`;
  if (n === 0) return "1/0 AWG";
  return `${Math.abs(n) + 1}/0 AWG`;
};

/** Standard AWG geometric relationship. */
export const awgAreaMm2 = (n: number): number => {
  const diameterInches = 0.005 * Math.pow(92, (36 - n) / 39);
  const diameterMm = diameterInches * 25.4;
  return (Math.PI / 4) * diameterMm * diameterMm;
};

const metricCatalog: ConductorSize[] = METRIC_MM2.map((mm2, index) => ({
  id: `mm2-${String(mm2).replace(".", "-")}`,
  label: `${mm2} mm²`,
  mm2,
  system: "metric",
  sortOrder: index,
}));

const awgCatalog: ConductorSize[] = [
  ...AWG_NUMBERS.map((n) => ({
    id: `awg-${n}`,
    label: awgLabel(n),
    mm2: awgAreaMm2(n),
    system: "awg" as const,
    sortOrder: 0,
  })),
  ...KCMIL_SIZES.map((kcmil) => ({
    id: `kcmil-${kcmil}`,
    label: `${kcmil} kcmil`,
    mm2: kcmil * KCMIL_TO_MM2,
    system: "awg" as const,
    sortOrder: 0,
  })),
]
  .sort((a, b) => a.mm2 - b.mm2)
  .map((row, index) => ({ ...row, sortOrder: index }));

export const CONDUCTOR_CATALOG: ConductorSize[] = [
  ...metricCatalog,
  ...awgCatalog,
];

export const getConductorCatalog = (system: ConductorSystem) =>
  CONDUCTOR_CATALOG.filter((row) => row.system === system).sort(
    (a, b) => a.mm2 - b.mm2
  );

export const findConductor = (id: string): ConductorSize | null =>
  CONDUCTOR_CATALOG.find((row) => row.id === id) || null;

export const findNearestEquivalent = (
  conductor: ConductorSize
): ConductorSize | null => {
  const targetSystem: ConductorSystem =
    conductor.system === "metric" ? "awg" : "metric";
  const options = getConductorCatalog(targetSystem);
  if (!options.length) return null;
  return options.reduce((best, current) => {
    const bestError = Math.abs(Math.log(best.mm2 / conductor.mm2));
    const currentError = Math.abs(Math.log(current.mm2 / conductor.mm2));
    return currentError < bestError ? current : best;
  }, options[0]);
};

const finite = (value: number, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, finite(value, min)));

export const lengthToMeters = (length: number, unit: LengthUnit) =>
  Math.max(0, finite(length)) * (unit === "ft" ? FT_TO_M : 1);

export const metersToLength = (meters: number, unit: LengthUnit) =>
  Math.max(0, finite(meters)) / (unit === "ft" ? FT_TO_M : 1);

export const calculateLoadElectricalValues = (
  input: Pick<
    ElectricalInput,
    "circuitType" | "inputMode" | "loadValue" | "voltage" | "powerFactor"
  >
): LoadElectricalValues => {
  const voltage = Math.max(1e-9, Math.abs(finite(input.voltage)));
  const pf = input.circuitType === "dc" ? 1 : clamp(input.powerFactor, 0.01, 1);
  const value = Math.max(0, finite(input.loadValue));
  const phaseFactor = input.circuitType === "three-phase" ? SQRT3 : 1;

  let currentA = 0;
  let activePowerKw = 0;
  let apparentPowerKva = 0;

  if (input.inputMode === "amps") {
    currentA = value;
    apparentPowerKva = (phaseFactor * voltage * currentA) / 1000;
    activePowerKw =
      input.circuitType === "dc"
        ? apparentPowerKva
        : apparentPowerKva * pf;
  } else if (input.inputMode === "kva") {
    apparentPowerKva = value;
    currentA = (apparentPowerKva * 1000) / (phaseFactor * voltage);
    activePowerKw =
      input.circuitType === "dc" ? apparentPowerKva : apparentPowerKva * pf;
  } else {
    activePowerKw = input.inputMode === "watts" ? value / 1000 : value;
    apparentPowerKva =
      input.circuitType === "dc" ? activePowerKw : activePowerKw / pf;
    currentA = (apparentPowerKva * 1000) / (phaseFactor * voltage);
  }

  return {
    currentA,
    activePowerKw,
    apparentPowerKva,
    powerFactorUsed: pf,
  };
};

export const resistanceOhmPerKm = ({
  material,
  areaMm2,
  conductorTemperatureC,
  overrideOhmPerKm,
}: {
  material: ConductorMaterial;
  areaMm2: number;
  conductorTemperatureC: number;
  overrideOhmPerKm?: number | null;
}): number => {
  if (
    typeof overrideOhmPerKm === "number" &&
    Number.isFinite(overrideOhmPerKm) &&
    overrideOhmPerKm > 0
  ) {
    return overrideOhmPerKm;
  }

  const area = Math.max(areaMm2, 1e-12);
  const constants = MATERIAL[material];
  const temp = clamp(conductorTemperatureC, -50, 200);
  const temperatureFactor = 1 + constants.alpha20PerC * (temp - 20);
  return (constants.rho20OhmMm2PerM / area) * 1000 * temperatureFactor;
};

const calculateForConductor = (
  input: ElectricalInput,
  conductor: ConductorSize,
  load: LoadElectricalValues,
  designCurrentA: number
): ConductorCalculation => {
  const oneWayLengthM = lengthToMeters(input.length, input.lengthUnit);
  const lengthKm = oneWayLengthM / 1000;
  const parallelRuns = Math.max(1, Math.floor(finite(input.parallelRuns, 1)));
  const resistance = resistanceOhmPerKm({
    material: input.material,
    areaMm2: conductor.mm2,
    conductorTemperatureC: input.conductorTemperatureC,
    overrideOhmPerKm: input.resistanceOverrideOhmPerKm,
  });
  const reactance =
    input.circuitType === "dc"
      ? 0
      : Math.max(0, finite(input.reactanceOhmPerKm));
  const pf = load.powerFactorUsed;
  const sinPhi = input.circuitType === "dc" ? 0 : Math.sqrt(Math.max(0, 1 - pf * pf));

  const multiplier =
    input.circuitType === "three-phase" ? SQRT3 : 2;
  const effectiveImpedancePerKm =
    input.circuitType === "dc"
      ? resistance / parallelRuns
      : (resistance * pf + reactance * sinPhi) / parallelRuns;

  const voltageDropAtCurrent = (currentA: number) =>
    multiplier * currentA * lengthKm * effectiveImpedancePerKm;

  const voltageDropV = voltageDropAtCurrent(load.currentA);
  const designVoltageDropV = voltageDropAtCurrent(designCurrentA);
  const voltage = Math.max(input.voltage, 1e-9);
  const voltageDropPct = (voltageDropV / voltage) * 100;
  const designVoltageDropPct = (designVoltageDropV / voltage) * 100;

  // Real conductor loss uses resistance only; reactance does not dissipate real power.
  const pathResistanceOhm =
    input.circuitType === "three-phase"
      ? 3 * lengthKm * (resistance / parallelRuns)
      : 2 * lengthKm * (resistance / parallelRuns);
  const powerLossW = load.currentA * load.currentA * pathResistanceOhm;
  const activePowerW = load.activePowerKw * 1000;
  const powerLossPctOfActiveLoad =
    activePowerW > 0 ? (powerLossW / activePowerW) * 100 : null;

  const operatingHours = clamp(input.operatingHoursPerDay, 0, 24);
  const annualLossKWh = (powerLossW * operatingHours * 365) / 1000;
  const annualLossCost =
    annualLossKWh * Math.max(0, finite(input.energyCostPerKWh));

  const allowedDropV = voltage * (clamp(input.targetVoltageDropPct, 0.01, 100) / 100);
  const voltageDropPerKmPerAmp = multiplier * effectiveImpedancePerKm;
  const maxLengthMAtTarget =
    load.currentA > 0 && voltageDropPerKmPerAmp > 0
      ? (allowedDropV / (load.currentA * voltageDropPerKmPerAmp)) * 1000
      : null;
  const maxCurrentAAtTarget =
    lengthKm > 0 && voltageDropPerKmPerAmp > 0
      ? allowedDropV / (lengthKm * voltageDropPerKmPerAmp)
      : null;

  const ampacity =
    typeof input.cableAmpacityA === "number" &&
    Number.isFinite(input.cableAmpacityA) &&
    input.cableAmpacityA > 0
      ? input.cableAmpacityA
      : null;
  const ampacityUtilizationPct =
    ampacity !== null ? (designCurrentA / ampacity) * 100 : null;
  const ampacityPass = ampacity !== null ? designCurrentA <= ampacity : null;

  return {
    conductor,
    equivalentConductor: findNearestEquivalent(conductor),
    resistanceOhmPerKm: resistance,
    reactanceOhmPerKm: reactance,
    voltageDropV,
    voltageDropPct,
    receivingVoltageV: Math.max(0, input.voltage - voltageDropV),
    designVoltageDropV,
    designVoltageDropPct,
    powerLossW,
    powerLossPctOfActiveLoad,
    annualLossKWh,
    annualLossCost,
    maxLengthMAtTarget,
    maxCurrentAAtTarget,
    ampacityUtilizationPct,
    ampacityPass,
  };
};

const recommendConductor = (
  input: ElectricalInput,
  load: LoadElectricalValues,
  designCurrentA: number
): ConductorCalculation | null => {
  const candidates = getConductorCatalog(input.conductorSystem);
  const target = clamp(input.targetVoltageDropPct, 0.01, 100);

  for (const conductor of candidates) {
    const result = calculateForConductor(input, conductor, load, designCurrentA);
    if (result.designVoltageDropPct <= target + 1e-12) return result;
  }

  if (!candidates.length) return null;
  return calculateForConductor(
    input,
    candidates[candidates.length - 1],
    load,
    designCurrentA
  );
};

export const normalizeElectricalInput = (
  raw: ElectricalInput
): ElectricalInput => {
  const system = raw.conductorSystem === "awg" ? "awg" : "metric";
  const catalog = getConductorCatalog(system);
  const selected = findConductor(raw.selectedConductorId);
  const defaultSelected =
    catalog.find((row) =>
      system === "metric" ? row.id === "mm2-10" : row.id === "awg-8"
    ) || catalog[Math.min(5, catalog.length - 1)];

  return {
    calculationMode: [
      "wire-size",
      "voltage-drop",
      "max-length",
      "max-current",
      "power-loss",
    ].includes(raw.calculationMode)
      ? raw.calculationMode
      : "wire-size",
    circuitType: ["dc", "single-phase", "three-phase"].includes(raw.circuitType)
      ? raw.circuitType
      : "single-phase",
    inputMode: ["amps", "watts", "kw", "kva"].includes(raw.inputMode)
      ? raw.inputMode
      : "kw",
    loadValue: clamp(raw.loadValue, 0, 1e9),
    voltage: clamp(raw.voltage, 1, 1500),
    powerFactor: clamp(raw.powerFactor, 0.01, 1),
    length: clamp(raw.length, 0, 1e7),
    lengthUnit: raw.lengthUnit === "ft" ? "ft" : "m",
    material: raw.material === "aluminum" ? "aluminum" : "copper",
    conductorTemperatureC: clamp(raw.conductorTemperatureC, -50, 200),
    targetVoltageDropPct: clamp(raw.targetVoltageDropPct, 0.01, 100),
    conductorSystem: system,
    selectedConductorId:
      selected && selected.system === system
        ? selected.id
        : defaultSelected?.id || catalog[0]?.id || "mm2-10",
    parallelRuns: Math.max(1, Math.min(24, Math.floor(finite(raw.parallelRuns, 1)))),
    designCurrentMultiplier: clamp(raw.designCurrentMultiplier, 1, 5),
    reactanceOhmPerKm: clamp(raw.reactanceOhmPerKm, 0, 100),
    resistanceOverrideOhmPerKm:
      typeof raw.resistanceOverrideOhmPerKm === "number" &&
      Number.isFinite(raw.resistanceOverrideOhmPerKm) &&
      raw.resistanceOverrideOhmPerKm > 0
        ? raw.resistanceOverrideOhmPerKm
        : null,
    cableAmpacityA:
      typeof raw.cableAmpacityA === "number" &&
      Number.isFinite(raw.cableAmpacityA) &&
      raw.cableAmpacityA > 0
        ? raw.cableAmpacityA
        : null,
    operatingHoursPerDay: clamp(raw.operatingHoursPerDay, 0, 24),
    energyCostPerKWh: clamp(raw.energyCostPerKWh, 0, 1e6),
    currencyCode:
      typeof raw.currencyCode === "string" && raw.currencyCode.trim()
        ? raw.currencyCode.trim().slice(0, 8).toUpperCase()
        : "USD",
  };
};

export const calculateElectrical = (rawInput: ElectricalInput): ElectricalResult => {
  const input = normalizeElectricalInput(rawInput);
  const warnings: string[] = [];
  const assumptions: string[] = [];
  const load = calculateLoadElectricalValues(input);
  const designCurrentA = load.currentA * input.designCurrentMultiplier;

  const selectedConductor =
    findConductor(input.selectedConductorId) ||
    getConductorCatalog(input.conductorSystem)[0];

  if (!selectedConductor) {
    throw new Error("No conductor sizes are available for the selected system.");
  }

  const selected = calculateForConductor(
    input,
    selectedConductor,
    load,
    designCurrentA
  );
  const recommended = recommendConductor(input, load, designCurrentA);
  const governing =
    input.calculationMode === "wire-size" && recommended ? recommended : selected;

  if (input.circuitType === "three-phase") {
    assumptions.push(
      "Three-phase calculations assume a balanced load and the entered voltage is line-to-line."
    );
  } else if (input.circuitType === "single-phase") {
    assumptions.push(
      "Single-phase cable length is the one-way run; the engine accounts for the outgoing and return conductors."
    );
  } else {
    assumptions.push(
      "DC cable length is the one-way run; the engine accounts for both positive and negative conductors."
    );
  }

  assumptions.push(
    `Conductor resistance is calculated at ${input.conductorTemperatureC.toFixed(
      0
    )} °C from reference material resistivity unless a manufacturer resistance override is supplied.`
  );

  if (input.circuitType !== "dc" && input.reactanceOhmPerKm === 0) {
    warnings.push(
      "AC cable reactance is set to 0 Ω/km. For long runs, large conductors, low power factor, or engineering-grade studies, enter the cable manufacturer's reactance value."
    );
  }

  if (input.calculationMode === "wire-size") {
    warnings.push(
      "The recommended conductor is the minimum standard size that meets the selected voltage-drop target in this model. Thermal ampacity, installation method, grouping, ambient-temperature correction, short-circuit withstand, terminal ratings, and local electrical-code rules must still be checked separately."
    );
    if (recommended && recommended.designVoltageDropPct > input.targetVoltageDropPct) {
      warnings.push(
        "Even the largest standard conductor in the selected catalog does not meet the requested voltage-drop target. Consider parallel conductors, a higher system voltage, or a shorter run."
      );
    }
  }

  if (input.designCurrentMultiplier > 1) {
    assumptions.push(
      `Voltage-drop conductor sizing uses a user-selected design-current multiplier of ${input.designCurrentMultiplier.toFixed(
        2
      )}×. Real power-loss estimates use the calculated operating current, not the design multiplier.`
    );
  }

  if (input.cableAmpacityA !== null) {
    if (selected.ampacityPass === false) {
      warnings.push(
        "The selected cable's user-entered allowable ampacity is below the design current. Do not use this conductor without a compliant redesign."
      );
    }
    assumptions.push(
      "The ampacity check uses the allowable ampacity entered by the user from an applicable cable datasheet or local electrical code; the tool does not invent a universal ampacity table."
    );
  } else {
    warnings.push(
      "No thermal ampacity has been entered. Voltage-drop compliance alone does not prove that a conductor is safe for the load."
    );
  }

  if (input.resistanceOverrideOhmPerKm !== null) {
    assumptions.push(
      "Manufacturer resistance override is active. The entered Ω/km value is used directly instead of the material/temperature resistance model."
    );
  }

  if (input.circuitType === "dc" && input.inputMode === "kva") {
    warnings.push("For DC, kVA is treated as kW because reactive power is not modeled.");
  }

  if (governing.receivingVoltageV <= 0 && load.currentA > 0) {
    warnings.push(
      "Calculated voltage drop equals or exceeds the source voltage. The circuit is outside a practical operating range; increase conductor size, voltage, or reduce length/load."
    );
  }

  return {
    engineVersion: ELECTRICAL_ENGINE_VERSION,
    input,
    load,
    designCurrentA,
    selected,
    recommended,
    governingConductor: governing,
    targetVoltageDropPct: input.targetVoltageDropPct,
    warnings: Array.from(new Set(warnings)),
    assumptions: Array.from(new Set(assumptions)),
  };
};

export const defaultElectricalInput = (): ElectricalInput => ({
  calculationMode: "wire-size",
  circuitType: "single-phase",
  inputMode: "kw",
  loadValue: 5,
  voltage: 230,
  powerFactor: 0.9,
  length: 30,
  lengthUnit: "m",
  material: "copper",
  conductorTemperatureC: 75,
  targetVoltageDropPct: 3,
  conductorSystem: "metric",
  selectedConductorId: "mm2-10",
  parallelRuns: 1,
  designCurrentMultiplier: 1,
  reactanceOhmPerKm: 0,
  resistanceOverrideOhmPerKm: null,
  cableAmpacityA: null,
  operatingHoursPerDay: 8,
  energyCostPerKWh: 0.15,
  currencyCode: "USD",
});
