"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

// ============================================================================
// Green Engineering Tools - LCA Engine V2
// ----------------------------------------------------------------------------
// Design goals:
// 1) NEVER invent missing EPD impacts.
// 2) Preserve source/provenance and declared units.
// 3) Use one calculation engine for UI, PDF and CSV.
// 4) Store original user material aliases so later users can auto-resolve.
// 5) Keep Module D separate from A-C totals.
// 6) Model replacement impacts in B4 instead of multiplying initial A modules.
// 7) O(n) calculations with Map-based indexes and paginated rendering.
//
// Existing API compatibility:
// - GET/POST /api/epd
// - GET /api/ec3?search=...
// Optional API for cross-user alias memory:
// - GET/POST /api/material-mappings
// ============================================================================

type TransportMode = "truck" | "rail" | "ship";
type ModelType = "baseline" | "proposed";
type ActiveView = "baseline" | "proposed" | "comparison";
type DashboardTab = "overview" | "materials" | "use" | "procurement" | "quality";

type LcaModule =
  | "A1A3"
  | "A4"
  | "A5"
  | "B1"
  | "B2"
  | "B3"
  | "B4"
  | "B5"
  | "B6"
  | "B7"
  | "C1"
  | "C2"
  | "C3"
  | "C4"
  | "D";

type ImpactMetric =
  | "gwp"
  | "gwpFossil"
  | "gwpBiogenic"
  | "gwpLuluc"
  | "acidification"
  | "smog"
  | "eutrophication"
  | "ozone"
  | "energy";

interface ImpactSet {
  gwp?: number | null;
  gwpFossil?: number | null;
  gwpBiogenic?: number | null;
  gwpLuluc?: number | null;
  acidification?: number | null;
  smog?: number | null;
  eutrophication?: number | null;
  ozone?: number | null;
  energy?: number | null;
}

interface EpdRecord {
  id: string;
  name: string;
  aliases: string[];
  manufacturer?: string;
  category: string;
  source: "EC3" | "EPD" | "Generic" | "Custom" | "Legacy";
  declaredUnit: string;
  declaredQuantity: number;
  massKgPerDeclaredUnit?: number | null;
  densityKgM3?: number | null;
  referenceServiceLifeYears?: number | null;
  geography?: string;
  plant?: string;
  pcr?: string;
  programOperator?: string;
  validUntil?: string;
  modules: Partial<Record<LcaModule, ImpactSet>>;
  metadata?: Record<string, unknown>;
}

interface BomRow {
  id: string;
  materialName: string; // Keep original BIM/CSV name for traceability.
  epdId?: string;
  quantity: number;
  unit: string;
  distanceKm: number;
  mode: TransportMode;
  thicknessM?: number | null;
  costPerInputUnit: number;
}

interface CalculatedLine {
  row: BomRow;
  epd?: EpdRecord;
  declaredQuantity: number | null;
  massKg: number | null;
  replacementCount: number;
  modules: Partial<Record<LcaModule, ImpactSet>>;
  aToC: ImpactSet;
  moduleD: ImpactSet;
  aToCPlusD: ImpactSet;
  cost: number;
  carbonPerDollar: number | null;
  warnings: string[];
}

interface ProjectReport {
  lines: CalculatedLine[];
  moduleTotals: Partial<Record<LcaModule, ImpactSet>>;
  aToC: ImpactSet;
  moduleD: ImpactSet;
  aToCPlusD: ImpactSet;
  totalCost: number;
  warnings: string[];
  mappedRows: number;
  unmappedRows: number;
  mappedQuantityShare: number;
}

interface MaterialMapping {
  alias: string;
  normalizedAlias: string;
  epdId: string;
}

interface PendingUpload {
  type: ModelType;
  data: Record<string, unknown>[];
  headers: string[];
}

interface PendingReconciliation {
  type: ModelType;
  rows: BomRow[];
  unknownAliases: string[];
}

const MODULE_ORDER: LcaModule[] = [
  "A1A3",
  "A4",
  "A5",
  "B1",
  "B2",
  "B3",
  "B4",
  "B5",
  "B6",
  "B7",
  "C1",
  "C2",
  "C3",
  "C4",
  "D",
];

const A_TO_C_MODULES: LcaModule[] = MODULE_ORDER.filter((m) => m !== "D");
const METRICS: ImpactMetric[] = [
  "gwp",
  "gwpFossil",
  "gwpBiogenic",
  "gwpLuluc",
  "acidification",
  "smog",
  "eutrophication",
  "ozone",
  "energy",
];

// Approximate freight factors for route-scenario A4 GWP only.
// Keep editable and document their source in production.
const TRANSPORT_GWP_KG_PER_TKM: Record<TransportMode, number> = {
  truck: 0.15,
  rail: 0.02,
  ship: 0.015,
};

const EC3_PERSISTENCE_ALLOWED =
  process.env.NEXT_PUBLIC_EC3_PERSISTENCE_ALLOWED === "true";

const CSI_DIVISIONS = [
  "Div 03: Concrete",
  "Div 04: Masonry",
  "Div 05: Metals",
  "Div 06: Wood, Plastics, and Composites",
  "Div 07: Thermal and Moisture Protection",
  "Div 08: Openings",
  "Div 09: Finishes",
  "Div 10-49: Other",
];

const emptyImpact = (): ImpactSet => ({});

const n = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const firstNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsed = nOrNull(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

const normalizeName = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[²]/g, "2")
    .replace(/[³]/g, "3")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const slugId = (value: string): string =>
  normalizeName(value).replace(/\s+/g, "-").slice(0, 80) || `epd-${Date.now()}`;

const canonicalUnit = (raw: string): string => {
  const v = String(raw || "unit")
    .toLowerCase()
    .trim()
    .replace(/^1\s*/, "")
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/\s+/g, "");

  const aliases: Record<string, string> = {
    kg: "kg",
    kilogram: "kg",
    kilograms: "kg",
    t: "t",
    ton: "t",
    tonne: "t",
    tonnes: "t",
    lb: "lb",
    lbs: "lb",
    pound: "lb",
    pounds: "lb",
    m3: "m3",
    "m^3": "m3",
    cubicmeter: "m3",
    cubicmetre: "m3",
    ft3: "ft3",
    "ft^3": "ft3",
    m2: "m2",
    "m^2": "m2",
    squaremeter: "m2",
    squaremetre: "m2",
    ft2: "ft2",
    "ft^2": "ft2",
    m: "m",
    meter: "m",
    metre: "m",
    ft: "ft",
    feet: "ft",
    unit: "unit",
    units: "unit",
    ea: "unit",
    each: "unit",
    pcs: "unit",
    piece: "unit",
    pieces: "unit",
  };

  return aliases[v] || v;
};

type UnitDimension = "mass" | "volume" | "area" | "length" | "count" | "unknown";

const unitInfo = (unitRaw: string): { unit: string; dimension: UnitDimension; toSI: number } => {
  const unit = canonicalUnit(unitRaw);
  const info: Record<string, { dimension: UnitDimension; toSI: number }> = {
    kg: { dimension: "mass", toSI: 1 },
    t: { dimension: "mass", toSI: 1000 },
    lb: { dimension: "mass", toSI: 0.45359237 },
    m3: { dimension: "volume", toSI: 1 },
    ft3: { dimension: "volume", toSI: 0.028316846592 },
    m2: { dimension: "area", toSI: 1 },
    ft2: { dimension: "area", toSI: 0.09290304 },
    m: { dimension: "length", toSI: 1 },
    ft: { dimension: "length", toSI: 0.3048 },
    unit: { dimension: "count", toSI: 1 },
  };
  return { unit, ...(info[unit] || { dimension: "unknown", toSI: 1 }) };
};

const convertQuantity = (
  quantity: number,
  fromUnitRaw: string,
  toUnitRaw: string,
  epd: EpdRecord,
  row: BomRow
): { value: number | null; warning?: string } => {
  const from = unitInfo(fromUnitRaw);
  const to = unitInfo(toUnitRaw);

  if (from.unit === to.unit) return { value: quantity };

  if (from.dimension === to.dimension && from.dimension !== "unknown") {
    const si = quantity * from.toSI;
    return { value: si / to.toSI };
  }

  const density = epd.densityKgM3 ?? null;
  const thickness = row.thicknessM ?? null;

  // Mass <-> volume using verified/material density.
  if (density && density > 0) {
    if (from.dimension === "mass" && to.dimension === "volume") {
      const kg = quantity * from.toSI;
      const m3 = kg / density;
      return { value: m3 / to.toSI };
    }
    if (from.dimension === "volume" && to.dimension === "mass") {
      const m3 = quantity * from.toSI;
      const kg = m3 * density;
      return { value: kg / to.toSI };
    }
  }

  // Area <-> volume only when thickness is known.
  if (thickness && thickness > 0) {
    if (from.dimension === "area" && to.dimension === "volume") {
      const m2 = quantity * from.toSI;
      const m3 = m2 * thickness;
      return { value: m3 / to.toSI };
    }
    if (from.dimension === "volume" && to.dimension === "area") {
      const m3 = quantity * from.toSI;
      const m2 = m3 / thickness;
      return { value: m2 / to.toSI };
    }
  }

  return {
    value: null,
    warning: `Cannot convert ${quantity} ${fromUnitRaw} to EPD declared unit ${toUnitRaw}. Add density/thickness or correct the unit mapping.`,
  };
};

const getMassKg = (
  row: BomRow,
  epd: EpdRecord,
  declaredQuantity: number | null
): number | null => {
  const from = unitInfo(row.unit);
  if (from.dimension === "mass") return row.quantity * from.toSI;

  if (from.dimension === "volume" && epd.densityKgM3 && epd.densityKgM3 > 0) {
    return row.quantity * from.toSI * epd.densityKgM3;
  }

  if (from.dimension === "area" && row.thicknessM && epd.densityKgM3) {
    return row.quantity * from.toSI * row.thicknessM * epd.densityKgM3;
  }

  if (declaredQuantity !== null && epd.massKgPerDeclaredUnit && epd.massKgPerDeclaredUnit > 0) {
    return declaredQuantity * epd.massKgPerDeclaredUnit;
  }

  return null;
};

const scaleImpact = (impact: ImpactSet | undefined, factor: number): ImpactSet => {
  const out: ImpactSet = {};
  if (!impact) return out;
  METRICS.forEach((metric) => {
    const value = impact[metric];
    if (typeof value === "number" && Number.isFinite(value)) out[metric] = value * factor;
  });
  return out;
};

const addImpact = (...sets: (ImpactSet | undefined)[]): ImpactSet => {
  const out: ImpactSet = {};
  METRICS.forEach((metric) => {
    const available = sets
      .map((set) => set?.[metric])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (available.length) out[metric] = available.reduce((sum, value) => sum + value, 0);
  });
  return out;
};

const sumModules = (
  modules: Partial<Record<LcaModule, ImpactSet>>,
  selected: LcaModule[]
): ImpactSet => addImpact(...selected.map((module) => modules[module]));

const moduleValue = (
  raw: any,
  module: LcaModule,
  metric: ImpactMetric,
  aliases: string[] = []
): number | null => {
  const candidates: unknown[] = [
    raw?.modules?.[module]?.[metric],
    raw?.impacts?.[module]?.[metric],
    raw?.lca_modules?.[module]?.[metric],
  ];
  aliases.forEach((alias) => {
    candidates.push(raw?.[alias]);
    candidates.push(raw?.[alias.toLowerCase()]);
  });
  return firstNumber(...candidates);
};

const compactImpact = (impact: ImpactSet): ImpactSet => {
  const out: ImpactSet = {};
  METRICS.forEach((metric) => {
    const value = impact[metric];
    if (typeof value === "number" && Number.isFinite(value)) out[metric] = value;
  });
  return out;
};

const guessCategory = (name: string, rawCategory?: string): string => {
  const cat = rawCategory || "";
  if (/Div\s?\d+/i.test(cat)) return cat;
  const v = `${name} ${cat}`.toLowerCase();
  if (/concrete|cement|grout/.test(v)) return "Div 03: Concrete";
  if (/masonry|brick|block/.test(v)) return "Div 04: Masonry";
  if (/steel|aluminum|aluminium|metal|rebar/.test(v)) return "Div 05: Metals";
  if (/wood|timber|plywood|gypsum.*wood/.test(v)) return "Div 06: Wood, Plastics, and Composites";
  if (/insulation|roof|membrane|waterproof/.test(v)) return "Div 07: Thermal and Moisture Protection";
  if (/glass|window|door|glazing/.test(v)) return "Div 08: Openings";
  if (/paint|gypsum|ceiling|tile|carpet|finish/.test(v)) return "Div 09: Finishes";
  return "Div 10-49: Other";
};

const adaptStoredEpd = (raw: any): EpdRecord => {
  const name = firstString(raw?.name, raw?.material_name, raw?.product_name) || "Unnamed EPD";
  const id = firstString(raw?.id, raw?.epd_id, raw?.uuid) || `stored-${slugId(name)}`;
  const declaredUnit = firstString(raw?.declaredUnit, raw?.declared_unit, raw?.unit) || "unit";

  const legacyA1A3: ImpactSet = compactImpact({
    gwp: firstNumber(raw?.gwp_a1a3, raw?.gwp_mfg, raw?.phases?.manufacturing),
    gwpBiogenic: firstNumber(raw?.gwp_biogenic, raw?.biogenic),
    acidification: firstNumber(raw?.traci_acidification, raw?.traci?.acidification),
    smog: firstNumber(raw?.traci_smog, raw?.traci?.smog),
    eutrophication: firstNumber(raw?.traci_eutrophication, raw?.traci?.eutrophication),
    ozone: firstNumber(raw?.traci_ozone, raw?.traci?.ozone),
    energy: firstNumber(raw?.traci_energy, raw?.traci?.energy),
  });

  const modules: Partial<Record<LcaModule, ImpactSet>> = {};
  MODULE_ORDER.forEach((module) => {
    const src = raw?.modules?.[module];
    if (src && typeof src === "object") modules[module] = compactImpact(src);
  });

  if (!modules.A1A3 && Object.keys(legacyA1A3).length) modules.A1A3 = legacyA1A3;
  if (!modules.A5) {
    const gwp = firstNumber(raw?.gwp_a5, raw?.gwp_con, raw?.phases?.construction);
    if (gwp !== null) modules.A5 = { gwp };
  }
  if (!modules.B1) {
    const gwp = firstNumber(raw?.gwp_b1, raw?.gwp_use, raw?.phases?.use);
    if (gwp !== null) modules.B1 = { gwp };
  }
  if (!modules.C4) {
    const gwp = firstNumber(raw?.gwp_c4, raw?.gwp_eol, raw?.phases?.eol);
    if (gwp !== null) modules.C4 = { gwp };
  }

  const aliases = Array.from(
    new Set([
      name,
      ...(Array.isArray(raw?.aliases) ? raw.aliases.filter((x: unknown) => typeof x === "string") : []),
      ...(Array.isArray(raw?.material_aliases) ? raw.material_aliases.filter((x: unknown) => typeof x === "string") : []),
    ])
  );

  return {
    id,
    name,
    aliases,
    manufacturer: firstString(raw?.manufacturer, raw?.manufacturer_name),
    category: guessCategory(name, firstString(raw?.category, raw?.csi_category)),
    source: raw?.source === "EC3" ? "EC3" : raw?.source === "Custom" ? "Custom" : raw?.modules ? "EPD" : "Legacy",
    declaredUnit,
    declaredQuantity: firstNumber(raw?.declaredQuantity, raw?.declared_quantity, raw?.reference_quantity) || 1,
    massKgPerDeclaredUnit: firstNumber(raw?.massKgPerDeclaredUnit, raw?.mass_kg_per_declared_unit, raw?.weight_kg_per_unit),
    densityKgM3: firstNumber(raw?.densityKgM3, raw?.density_kg_m3, raw?.density),
    referenceServiceLifeYears: firstNumber(raw?.referenceServiceLifeYears, raw?.rsl_years, raw?.lifespan_years, raw?.lifespan),
    geography: firstString(raw?.geography, raw?.region),
    plant: firstString(raw?.plant, raw?.facility),
    pcr: firstString(raw?.pcr),
    programOperator: firstString(raw?.programOperator, raw?.program_operator),
    validUntil: firstString(raw?.validUntil, raw?.valid_until, raw?.expiry_date),
    modules,
    metadata: raw,
  };
};

const adaptEc3Result = (raw: any, localAlias: string): EpdRecord => {
  const name = firstString(raw?.name, raw?.product_name, raw?.material_name) || localAlias;
  const id = firstString(raw?.id, raw?.epd_id, raw?.uuid) || `ec3-${slugId(name)}`;
  const declaredUnit = firstString(raw?.declared_unit, raw?.declaredUnit, raw?.unit) || "unit";
  const modules: Partial<Record<LcaModule, ImpactSet>> = {};

  MODULE_ORDER.forEach((module) => {
    const impact: ImpactSet = compactImpact({
      gwp: moduleValue(raw, module, "gwp", [
        `gwp_${module.toLowerCase()}`,
        module === "A1A3" ? "gwp" : "",
      ].filter(Boolean)),
      gwpFossil: moduleValue(raw, module, "gwpFossil", [`gwp_fossil_${module.toLowerCase()}`]),
      gwpBiogenic: moduleValue(raw, module, "gwpBiogenic", [`gwp_biogenic_${module.toLowerCase()}`]),
      gwpLuluc: moduleValue(raw, module, "gwpLuluc", [`gwp_luluc_${module.toLowerCase()}`]),
      acidification: moduleValue(raw, module, "acidification", [`acidification_${module.toLowerCase()}`]),
      smog: moduleValue(raw, module, "smog", [`smog_${module.toLowerCase()}`]),
      eutrophication: moduleValue(raw, module, "eutrophication", [`eutrophication_${module.toLowerCase()}`]),
      ozone: moduleValue(raw, module, "ozone", [`ozone_${module.toLowerCase()}`]),
      energy: moduleValue(raw, module, "energy", [`energy_${module.toLowerCase()}`]),
    });
    if (Object.keys(impact).length) modules[module] = impact;
  });

  // Compatibility with the current EC3 proxy response in your existing UI:
  // if it returns only one GWP value, preserve it as A1-A3 ONLY.
  // Do not fabricate A4/A5/C4/TRACI values.
  if (!modules.A1A3) {
    const gwp = firstNumber(raw?.gwp, raw?.gwp_a1a3);
    const acid = firstNumber(raw?.traci_acidification);
    const smog = firstNumber(raw?.traci_smog);
    const eutro = firstNumber(raw?.traci_eutrophication);
    const ozone = firstNumber(raw?.traci_ozone);
    const energy = firstNumber(raw?.traci_energy);
    const impact = compactImpact({
      gwp,
      acidification: acid,
      smog,
      eutrophication: eutro,
      ozone,
      energy,
    });
    if (Object.keys(impact).length) modules.A1A3 = impact;
  }

  return {
    id,
    name,
    aliases: Array.from(new Set([name, localAlias])),
    manufacturer: firstString(raw?.manufacturer, raw?.manufacturer_name),
    category: guessCategory(name, firstString(raw?.category)),
    source: "EC3",
    declaredUnit,
    declaredQuantity: firstNumber(raw?.declared_quantity, raw?.reference_quantity) || 1,
    massKgPerDeclaredUnit: firstNumber(raw?.mass_kg_per_declared_unit, raw?.weight_kg_per_unit),
    densityKgM3: firstNumber(raw?.density_kg_m3, raw?.density),
    referenceServiceLifeYears: firstNumber(raw?.reference_service_life_years, raw?.rsl_years, raw?.lifespan_years),
    geography: firstString(raw?.geography, raw?.region),
    plant: firstString(raw?.plant, raw?.facility),
    pcr: firstString(raw?.pcr),
    programOperator: firstString(raw?.program_operator),
    validUntil: firstString(raw?.valid_until, raw?.expiry_date),
    modules,
    metadata: raw,
  };
};

const epdToApiPayload = (epd: EpdRecord) => ({
  id: epd.id,
  material_name: epd.name,
  aliases: epd.aliases,
  manufacturer: epd.manufacturer,
  category: epd.category,
  source: epd.source,
  declared_unit: epd.declaredUnit,
  declared_quantity: epd.declaredQuantity,
  mass_kg_per_declared_unit: epd.massKgPerDeclaredUnit,
  density_kg_m3: epd.densityKgM3,
  lifespan_years: epd.referenceServiceLifeYears,
  geography: epd.geography,
  plant: epd.plant,
  pcr: epd.pcr,
  program_operator: epd.programOperator,
  valid_until: epd.validUntil,
  modules: epd.modules,
  metadata: epd.metadata,
});

const countReplacements = (buildingLife: number, rsl?: number | null): number => {
  if (!rsl || rsl <= 0 || buildingLife <= rsl) return 0;
  // Example: 60-year building, 30-year RSL => one replacement at year 30.
  return Math.max(0, Math.ceil(buildingLife / rsl) - 1);
};

const calculateLine = (
  row: BomRow,
  epd: EpdRecord | undefined,
  buildingLife: number
): CalculatedLine => {
  const warnings: string[] = [];
  if (!epd) {
    return {
      row,
      epd: undefined,
      declaredQuantity: null,
      massKg: null,
      replacementCount: 0,
      modules: {},
      aToC: {},
      moduleD: {},
      aToCPlusD: {},
      cost: row.quantity * row.costPerInputUnit,
      carbonPerDollar: null,
      warnings: ["Material is not mapped to a verified dataset."],
    };
  }

  const converted = convertQuantity(row.quantity, row.unit, epd.declaredUnit, epd, row);
  if (converted.warning) warnings.push(converted.warning);
  const declaredQuantity = converted.value;
  const cost = row.quantity * row.costPerInputUnit;

  if (declaredQuantity === null) {
    return {
      row,
      epd,
      declaredQuantity: null,
      massKg: getMassKg(row, epd, null),
      replacementCount: 0,
      modules: {},
      aToC: {},
      moduleD: {},
      aToCPlusD: {},
      cost,
      carbonPerDollar: null,
      warnings,
    };
  }

  const dq = declaredQuantity / Math.max(epd.declaredQuantity || 1, 1e-12);
  const replacementCount = countReplacements(buildingLife, epd.referenceServiceLifeYears);
  const massKg = getMassKg(row, epd, declaredQuantity);
  const modules: Partial<Record<LcaModule, ImpactSet>> = {};

  // Initial product and installation stages.
  ["A1A3", "A5", "B1", "B2", "B3", "B5", "B7", "C1", "C2", "C3", "C4"].forEach((m) => {
    const module = m as LcaModule;
    if (epd.modules[module]) modules[module] = scaleImpact(epd.modules[module], dq);
  });

  // A4 route scenario: calculate GWP from actual model quantity + distance when mass is known.
  // Preserve any non-GWP indicators provided by the EPD A4 record.
  if (epd.modules.A4 || row.distanceKm > 0) {
    const a4 = scaleImpact(epd.modules.A4, dq);
    if (row.distanceKm > 0) {
      if (massKg !== null) {
        a4.gwp = (massKg / 1000) * row.distanceKm * TRANSPORT_GWP_KG_PER_TKM[row.mode];
      } else {
        warnings.push("A4 route GWP could not be calculated because material mass is unknown; EPD A4 (if present) was retained.");
      }
    }
    if (Object.keys(a4).length) modules.A4 = a4;
  }

  // B4 replacement package: impacts caused by replacement events during the study period.
  // We do NOT multiply the original A modules by replacements.
  if (replacementCount > 0) {
    const replacementPackage = addImpact(
      scaleImpact(epd.modules.A1A3, dq),
      modules.A4,
      scaleImpact(epd.modules.A5, dq),
      scaleImpact(epd.modules.C1, dq),
      scaleImpact(epd.modules.C2, dq),
      scaleImpact(epd.modules.C3, dq),
      scaleImpact(epd.modules.C4, dq)
    );
    modules.B4 = scaleImpact(replacementPackage, replacementCount);
  } else if (epd.modules.B4) {
    modules.B4 = scaleImpact(epd.modules.B4, dq);
  }

  // Module D is reported separately. Include the final product + replacement products.
  if (epd.modules.D) modules.D = scaleImpact(epd.modules.D, dq * (1 + replacementCount));

  const aToC = sumModules(modules, A_TO_C_MODULES);
  const moduleD = modules.D || emptyImpact();
  const aToCPlusD = addImpact(aToC, moduleD);
  const carbonPerDollar = cost > 0 && typeof aToC.gwp === "number" ? aToC.gwp / cost : null;

  return {
    row,
    epd,
    declaredQuantity,
    massKg,
    replacementCount,
    modules,
    aToC,
    moduleD,
    aToCPlusD,
    cost,
    carbonPerDollar,
    warnings,
  };
};

const calculateProject = (
  rows: BomRow[],
  epdById: Map<string, EpdRecord>,
  buildingLife: number,
  annualEnergyKwh: number,
  gridIntensity: number
): ProjectReport | null => {
  if (!rows.length) return null;

  const lines = rows.map((row) => calculateLine(row, row.epdId ? epdById.get(row.epdId) : undefined, buildingLife));
  const moduleTotals: Partial<Record<LcaModule, ImpactSet>> = {};
  MODULE_ORDER.forEach((module) => {
    const total = addImpact(...lines.map((line) => line.modules[module]));
    if (Object.keys(total).length) moduleTotals[module] = total;
  });

  // Operational energy is a project-level B6 scenario, not multiplied across materials.
  if (annualEnergyKwh > 0 && buildingLife > 0 && gridIntensity >= 0) {
    const operationalGwp = annualEnergyKwh * buildingLife * gridIntensity;
    moduleTotals.B6 = addImpact(moduleTotals.B6, { gwp: operationalGwp });
  }

  const aToC = sumModules(moduleTotals, A_TO_C_MODULES);
  const moduleD = moduleTotals.D || {};
  const aToCPlusD = addImpact(aToC, moduleD);
  const totalCost = lines.reduce((sum, line) => sum + line.cost, 0);
  const warnings = lines.flatMap((line) => line.warnings.map((warning) => `${line.row.materialName}: ${warning}`));
  const mappedRows = lines.filter((line) => !!line.epd && line.declaredQuantity !== null).length;
  const unmappedRows = lines.length - mappedRows;
  const totalQty = rows.reduce((sum, row) => sum + Math.abs(row.quantity), 0);
  const mappedQty = lines
    .filter((line) => !!line.epd && line.declaredQuantity !== null)
    .reduce((sum, line) => sum + Math.abs(line.row.quantity), 0);

  return {
    lines,
    moduleTotals,
    aToC,
    moduleD,
    aToCPlusD,
    totalCost,
    warnings,
    mappedRows,
    unmappedRows,
    mappedQuantityShare: totalQty > 0 ? (mappedQty / totalQty) * 100 : 0,
  };
};

const metricLabel: Record<ImpactMetric, string> = {
  gwp: "Global Warming Potential",
  gwpFossil: "GWP Fossil",
  gwpBiogenic: "GWP Biogenic",
  gwpLuluc: "GWP LULUC",
  acidification: "Acidification",
  smog: "Smog Formation",
  eutrophication: "Eutrophication",
  ozone: "Ozone Depletion",
  energy: "Primary Energy",
};

const metricUnit: Record<ImpactMetric, string> = {
  gwp: "kg CO₂e",
  gwpFossil: "kg CO₂e",
  gwpBiogenic: "kg CO₂e",
  gwpLuluc: "kg CO₂e",
  acidification: "kg SO₂e",
  smog: "kg O₃e",
  eutrophication: "kg Ne",
  ozone: "kg CFC-11e",
  energy: "MJ",
};

const fmt = (value: number | null | undefined, digits = 0): string =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "N/A";

const reductionPct = (baseline?: number | null, proposed?: number | null): number | null => {
  if (typeof baseline !== "number" || typeof proposed !== "number" || baseline === 0) return null;
  return ((baseline - proposed) / baseline) * 100;
};


const SEO_FAQS = [
  {
    q: "What is a free embodied carbon calculator for construction materials?",
    a: "An embodied carbon calculator estimates greenhouse-gas emissions associated with building materials and lifecycle stages. This tool lets you import material quantities, link them to EPD datasets, review lifecycle modules and compare baseline and proposed designs in kg CO₂e.",
  },
  {
    q: "How do I calculate A1-A3 embodied carbon from an EPD?",
    a: "Use the EPD's declared quantity and declared unit, convert your project quantity to that same basis, and multiply by the reported A1-A3 GWP value. The calculator keeps the declared unit attached to each dataset so unsupported conversions can be flagged instead of silently guessed.",
  },
  {
    q: "Can I upload a CSV or BIM material schedule for embodied carbon calculations?",
    a: "Yes. The workflow accepts CSV material schedules, lets you map material, quantity and unit columns, resolves known materials and sends unknown material names to the EC3 reconciliation step.",
  },
  {
    q: "What happens when a BIM material name does not match an EC3 product name?",
    a: "The original BIM or CSV alias is preserved, while the EC3 search term can be edited. This lets an engineer simplify a misspelled, abbreviated or overly specific material name and still save the final approved mapping for future imports when permitted by the connected data source.",
  },
  {
    q: "What are A1-A3, A4, A5, B4, C1-C4 and Module D in building LCA?",
    a: "A1-A3 cover product-stage impacts, A4 covers transport to site, A5 covers construction-stage impacts, B4 represents replacement during the study period, C1-C4 cover end-of-life processes, and Module D reports potential benefits or loads beyond the system boundary separately.",
  },
  {
    q: "How is embodied carbon intensity in kg CO2e per m2 calculated?",
    a: "When gross floor area is provided, the tool divides the selected project GWP total by floor area to report an intensity in kg CO₂e/m². Always compare projects using the same system boundary and study assumptions.",
  },
  {
    q: "What is the difference between EC3 and a whole-building LCA calculator?",
    a: "EC3 is especially useful for finding and comparing construction products using Environmental Product Declarations. A whole-building LCA combines material quantities, lifecycle modules and project assumptions across an entire building. This application uses EC3 reconciliation as one data workflow inside a broader building-LCA calculation process.",
  },
  {
    q: "Can this calculator compare a baseline and proposed building for LEED?",
    a: "The software includes a baseline-versus-proposed impact comparison and an indicative LEED v4 logic check. It should not be treated as certification or a substitute for project-specific LEED documentation until the project datasets, functional equivalence and methodology have been independently validated.",
  },
  {
    q: "Does the calculator include Module D recycling or reuse benefits?",
    a: "Module D is supported as a separate lifecycle result when the selected dataset declares it. The calculator does not invent a generic recycling credit when Module D data is missing.",
  },
  {
    q: "Can I use this as an EPD carbon calculator for concrete, steel, timber, insulation and finishes?",
    a: "Yes when an appropriate dataset and compatible declared unit are available. The system is material-agnostic and is designed to work with product-specific or other supported EPD records rather than relying on one hard-coded material list.",
  },
];


export default function GreenEngineeringSaaS() {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Green Engineering Tools LCA",
    applicationCategory: "EngineeringApplication",
    operatingSystem: "Web Browser",
    description:
      "Free browser-based embodied carbon and whole-building LCA calculator for construction materials, EPD data, CSV/BIM schedules, EC3 reconciliation and lifecycle modules.",
    featureList: [
      "Embodied carbon calculator for construction materials",
      "CSV and BIM material schedule import",
      "EC3 EPD reconciliation",
      "A1-A3 through C1-C4 lifecycle reporting",
      "Module D reporting",
      "Baseline and proposed building comparison",
      "kg CO2e per square metre intensity",
      "Carbon and procurement cost analysis",
    ],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-black tracking-widest uppercase">
            Free embodied carbon & whole-building LCA calculator
          </div>
          <h1 className="text-4xl sm:text-6xl font-black mt-6 tracking-tight">
            Embodied Carbon Calculator for <span className="text-emerald-400">Construction Materials</span>
          </h1>
          <p className="max-w-4xl mx-auto mt-5 text-slate-300 text-base sm:text-xl leading-relaxed">
            Upload CSV or BIM material quantities, reconcile unknown products with EC3 EPD data,
            calculate lifecycle carbon by module, compare baseline and proposed designs, and report
            building carbon intensity in kg CO₂e/m².
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2 text-xs font-bold text-slate-300">
            {["A1-A3", "A4-A5", "B4 replacements", "C1-C4", "Module D", "EPD data", "EC3 matching", "CSV/BIM"].map((item) => (
              <span key={item} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-[1500px] mx-auto px-2 sm:px-6 py-8 sm:py-12">
        <LcaEngineComponent />
      </section>

      <section className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Construction carbon calculation guide
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
              Free whole-building LCA calculator with EPD and EC3 material workflows
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Green Engineering Tools is designed for architects, engineers, estimators, sustainability
              consultants and students who need to turn a bill of materials into an understandable
              lifecycle carbon result. Instead of forcing every uploaded material into a generic carbon
              factor, the workflow keeps the original material name, looks for an approved mapping and
              flags unknown products for review.
            </p>
            <p className="mt-4 text-base leading-7 text-slate-600">
              The calculator is useful for early design studies, embodied-carbon screening, EPD-based
              comparisons and baseline-versus-proposed analysis. It separates lifecycle information by
              module so users can see where emissions occur rather than relying only on one building total.
              Missing EPD values remain unavailable instead of being silently converted into zero or an
              invented environmental impact.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-xl font-black text-slate-900">
                A1-A3 embodied carbon calculator
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Product-stage carbon normally begins with the quantity of a material and an environmental
                factor reported against an EPD declared unit. The engine converts compatible project units
                to the EPD basis and reports A1-A3 separately, allowing concrete, steel, timber, insulation,
                finishes and other products to be evaluated using their available datasets.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-xl font-black text-slate-900">
                CSV and BIM embodied carbon workflow
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Material schedules can be imported from CSV and mapped to material, quantity and unit
                columns. This makes the calculator useful for BIM quantity takeoffs and large bills of
                materials where manual re-entry would be slow and error-prone.
              </p>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-xl font-black text-slate-900">
                EC3 EPD material matching
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                When a material cannot be resolved locally, an engineer can search connected EC3 data,
                adjust the search wording and select the appropriate product. The original BIM alias is
                retained for traceability and can be reused as an approved mapping when your data
                permissions and backend configuration allow persistent storage.
              </p>
            </article>
          </div>

          <div className="mt-14 grid lg:grid-cols-[1.1fr_.9fr] gap-10 items-start">
            <article>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-950">
                How lifecycle modules are handled
              </h2>
              <p className="mt-4 text-slate-600 leading-7">
                A useful building LCA should make its system boundary visible. This application keeps
                product, construction, replacement and end-of-life information in separate modules and
                reports Module D outside the A-C total. That makes it easier to audit a result and compare
                scenarios using the same scope.
              </p>

              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="bg-slate-950 text-white">
                    <tr>
                      <th className="p-3 text-left">Lifecycle module</th>
                      <th className="p-3 text-left">What it represents</th>
                      <th className="p-3 text-left">How this tool uses it</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {[
                      ["A1-A3", "Raw materials, transport to manufacturing and product manufacturing", "Uses declared EPD/product-stage data when available"],
                      ["A4", "Transport from manufacturer or supplier to the project site", "Can use project transport distance and material mass"],
                      ["A5", "Construction and installation stage", "Kept distinct from A1-A3 and A4"],
                      ["B4", "Replacement during the building study period", "Uses service-life logic instead of multiplying the original A-stage result"],
                      ["C1-C4", "Deconstruction, waste transport, processing and disposal", "Reported as end-of-life modules when supplied by the dataset"],
                      ["D", "Benefits and loads beyond the building system boundary", "Reported separately and never invented when missing"],
                    ].map(([module, meaning, use]) => (
                      <tr key={module} className="bg-white">
                        <td className="p-3 font-black text-slate-900">{module}</td>
                        <td className="p-3 text-slate-600">{meaning}</td>
                        <td className="p-3 text-slate-600">{use}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <aside className="rounded-2xl bg-slate-950 text-white p-6 sm:p-8">
              <h2 className="text-2xl font-black">What the result can tell you</h2>
              <div className="mt-6 space-y-5">
                {[
                  ["Total A-C GWP", "See lifecycle global-warming potential without folding Module D into the result."],
                  ["kg CO₂e/m²", "Normalize carbon by gross floor area for easier project comparison."],
                  ["Baseline vs proposed", "Identify whether a design option reduces or increases selected environmental indicators."],
                  ["Carbon per dollar", "Combine unit cost and lifecycle carbon to support procurement discussions."],
                  ["Data-quality warnings", "Find unmapped materials, missing modules and unsupported unit conversions before relying on a result."],
                ].map(([title, body]) => (
                  <div key={title}>
                    <h3 className="font-black text-emerald-300">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{body}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              Frequently asked questions
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-black text-slate-950">
              Embodied carbon, EPD and whole-building LCA FAQs
            </h2>
            <p className="mt-4 text-slate-600 leading-7">
              Practical answers for people searching for construction carbon calculations, lifecycle
              modules, EC3 product data and BIM material workflows.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {SEO_FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group bg-white border border-slate-200 rounded-xl shadow-sm"
              >
                <summary className="cursor-pointer list-none p-5 sm:p-6 font-black text-slate-900 flex items-start justify-between gap-4">
                  <span>{faq.q}</span>
                  <span className="text-blue-600 text-xl leading-none group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-slate-600 leading-7">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-xl font-black text-slate-950">Methodology and responsible use</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This application is an engineering calculation and decision-support tool. Results depend on
            the quantities, declared units, environmental datasets, lifecycle boundaries, service-life
            assumptions and transport information supplied to the model. Product-specific EPDs should be
            checked against their original publication before formal reporting. Missing lifecycle values
            are intentionally kept unavailable rather than fabricated.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Baseline-versus-proposed and LEED-related outputs are provided as workflow support and
            indicative checks; they are not certification decisions. A formal whole-building LCA should
            use project-appropriate standards, functional equivalence, verified data and professional
            review.
          </p>
        </div>
      </section>
    </main>
  );
}

function LcaEngineComponent() {
  const [epds, setEpds] = useState<EpdRecord[]>([]);
  const [materialMappings, setMaterialMappings] = useState<MaterialMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [baselineRows, setBaselineRows] = useState<BomRow[]>([]);
  const [proposedRows, setProposedRows] = useState<BomRow[]>([]);
  const [activeView, setActiveView] = useState<ActiveView>("proposed");
  const [tab, setTab] = useState<DashboardTab>("overview");

  const [buildingLife, setBuildingLife] = useState(60);
  const [floorAreaM2, setFloorAreaM2] = useState(10000);
  const [annualEnergyKwh, setAnnualEnergyKwh] = useState(0);
  const [gridIntensity, setGridIntensity] = useState(0.38);

  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [columnMapping, setColumnMapping] = useState({ material: "", quantity: "", unit: "" });
  const [pendingReconciliation, setPendingReconciliation] = useState<PendingReconciliation | null>(null);
  const [ec3SearchResults, setEc3SearchResults] = useState<Record<string, any[]>>({});
  const [isSearchingEc3, setIsSearchingEc3] = useState<Record<string, boolean>>({});
  const [selectedEc3, setSelectedEc3] = useState<Record<string, any>>({});
  // Editable EC3 search text is intentionally separate from the original
  // CSV/BIM alias. The original alias is preserved for future auto-mapping.
  const [ec3SearchQueries, setEc3SearchQueries] = useState<Record<string, string>>({});

  const [showRevitModal, setShowRevitModal] = useState(false);
  const [showAssemblyBuilder, setShowAssemblyBuilder] = useState(false);
  const [assemblyName, setAssemblyName] = useState("");
  const [assemblyCategory, setAssemblyCategory] = useState(CSI_DIVISIONS[5]);
  const [assemblyUnit, setAssemblyUnit] = useState("m2");
  const [assemblyItems, setAssemblyItems] = useState<{ epdId: string; qtyDeclared: number }[]>([
    { epdId: "", qtyDeclared: 1 },
  ]);

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 100;

  const baselineInputRef = useRef<HTMLInputElement>(null);
  const proposedInputRef = useRef<HTMLInputElement>(null);

  const epdById = useMemo(() => new Map(epds.map((epd) => [epd.id, epd])), [epds]);

  const aliasToEpdId = useMemo(() => {
    const map = new Map<string, string>();
    epds.forEach((epd) => {
      [epd.name, ...epd.aliases].forEach((alias) => map.set(normalizeName(alias), epd.id));
    });
    materialMappings.forEach((mapping) => map.set(mapping.normalizedAlias, mapping.epdId));
    return map;
  }, [epds, materialMappings]);

  useEffect(() => {
    const load = async () => {
      const loadedEpds = new Map<string, EpdRecord>();
      const loadedMappings = new Map<string, MaterialMapping>();

      try {
        const cache = localStorage.getItem("lca_v2_epd_cache");
        if (cache) {
          (JSON.parse(cache) as any[]).forEach((raw) => {
            const epd = adaptStoredEpd(raw);
            loadedEpds.set(epd.id, epd);
          });
        }
        const mappingCache = localStorage.getItem("lca_v2_alias_cache");
        if (mappingCache) {
          (JSON.parse(mappingCache) as MaterialMapping[]).forEach((mapping) => {
            if (mapping?.normalizedAlias && mapping?.epdId) loadedMappings.set(mapping.normalizedAlias, mapping);
          });
        }
      } catch (error) {
        console.warn("Local LCA cache could not be read", error);
      }

      try {
        const response = await fetch("/api/epd", { cache: "no-store" });
        if (response.ok) {
          const json = await response.json();
          const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
          rows.forEach((raw: any) => {
            const epd = adaptStoredEpd(raw);
            loadedEpds.set(epd.id, epd);
          });
        }
      } catch (error) {
        console.warn("Central EPD database unavailable; using cache", error);
      }

      // Optional endpoint. If not present, the app still works using EPD aliases + local cache.
      try {
        const response = await fetch("/api/material-mappings", { cache: "no-store" });
        if (response.ok) {
          const json = await response.json();
          const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
          rows.forEach((raw: any) => {
            const alias = firstString(raw?.alias, raw?.material_alias);
            const epdId = firstString(raw?.epdId, raw?.epd_id);
            if (alias && epdId) {
              const mapping = { alias, normalizedAlias: normalizeName(alias), epdId };
              loadedMappings.set(mapping.normalizedAlias, mapping);
            }
          });
        }
      } catch {
        // Optional endpoint intentionally silent.
      }

      const epdArray = Array.from(loadedEpds.values());
      const mappingArray = Array.from(loadedMappings.values());
      setEpds(epdArray);
      setMaterialMappings(mappingArray);
      localStorage.setItem("lca_v2_epd_cache", JSON.stringify(epdArray));
      localStorage.setItem("lca_v2_alias_cache", JSON.stringify(mappingArray));
      setIsLoading(false);
    };
    load();
  }, []);

  const resolveEpdId = (materialName: string): string | undefined => aliasToEpdId.get(normalizeName(materialName));

  const parseCsvRows = (data: Record<string, unknown>[], mapping: typeof columnMapping): BomRow[] => {
    return data
      .map((raw, index) => {
        const materialName = String(raw[mapping.material] ?? "").trim();
        const quantity = n(raw[mapping.quantity], 0);
        const unit = String(raw[mapping.unit] ?? "unit").trim() || "unit";

        const distanceKey = Object.keys(raw).find((key) => /distance|transport.*km|km/i.test(key));
        const modeKey = Object.keys(raw).find((key) => /mode|transport.*type/i.test(key));
        const thicknessKey = Object.keys(raw).find((key) => /thickness/i.test(key));
        const costKey = Object.keys(raw).find((key) => /unit.*cost|cost.*unit|price/i.test(key));
        const rawMode = modeKey ? String(raw[modeKey] ?? "truck").toLowerCase() : "truck";
        const mode: TransportMode = rawMode.includes("rail") ? "rail" : rawMode.includes("ship") ? "ship" : "truck";

        return {
          id: `${Date.now()}-${index}-${slugId(materialName)}`,
          materialName: materialName || `Unnamed Material ${index + 1}`,
          epdId: materialName ? resolveEpdId(materialName) : undefined,
          quantity,
          unit,
          distanceKm: distanceKey ? n(raw[distanceKey], 300) : 300,
          mode,
          thicknessM: thicknessKey ? nOrNull(raw[thicknessKey]) : null,
          costPerInputUnit: costKey ? n(raw[costKey], 0) : 0,
        } satisfies BomRow;
      })
      .filter((row) => row.materialName && row.quantity !== 0);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: ModelType) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        const headers = results.meta.fields || [];
        setColumnMapping({
          material: headers.find((h) => /material|family|type|product|name/i.test(h)) || headers[0] || "",
          quantity: headers.find((h) => /qty|quantity|volume|area|mass|weight|count/i.test(h)) || headers[1] || "",
          unit: headers.find((h) => /unit|uom/i.test(h)) || headers[2] || "",
        });
        setPendingUpload({ type, data: results.data, headers });
        setIsProcessing(false);
      },
      error: (error) => {
        console.error(error);
        alert("CSV could not be parsed.");
        setIsProcessing(false);
      },
    });
    event.target.value = "";
  };

  const confirmMapping = () => {
    if (!pendingUpload || !columnMapping.material || !columnMapping.quantity || !columnMapping.unit) return;
    const rows = parseCsvRows(pendingUpload.data, columnMapping);
    const unknownAliases = Array.from(
      new Set(rows.filter((row) => !row.epdId).map((row) => row.materialName).filter(Boolean))
    );

    if (unknownAliases.length) {
      setPendingReconciliation({ type: pendingUpload.type, rows, unknownAliases });
    } else {
      commitRows(pendingUpload.type, rows);
    }
    setPendingUpload(null);
  };

  const commitRows = (type: ModelType, rows: BomRow[]) => {
    if (type === "baseline") {
      setBaselineRows(rows);
      setActiveView(proposedRows.length ? "comparison" : "baseline");
    } else {
      setProposedRows(rows);
      setActiveView(baselineRows.length ? "comparison" : "proposed");
    }
    setPage(0);
  };

  const searchEc3 = async (alias: string, query?: string) => {
    const searchTerm = (query ?? ec3SearchQueries[alias] ?? alias).trim();

    if (!searchTerm) {
      alert("Enter a material name to search EC3.");
      return;
    }

    setEc3SearchQueries((prev) => ({
      ...prev,
      [alias]: searchTerm,
    }));

    setIsSearchingEc3((prev) => ({ ...prev, [alias]: true }));

    try {
      const response = await fetch(
        `/api/ec3?search=${encodeURIComponent(searchTerm)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`EC3 proxy returned HTTP ${response.status}`);
      }

      const json = await response.json();
      const results = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];

      setEc3SearchResults((prev) => ({
        ...prev,
        [alias]: results,
      }));

      // A new search invalidates any EPD selected from the old result set.
      setSelectedEc3((prev) => {
        const next = { ...prev };
        delete next[alias];
        return next;
      });
    } catch (error) {
      console.error(error);
      alert(
        "EC3 search failed. Check /api/ec3 and its Building Transparency credentials."
      );
    } finally {
      setIsSearchingEc3((prev) => ({ ...prev, [alias]: false }));
    }
  };

  const persistEpdAndMapping = async (epd: EpdRecord, alias: string) => {
    const mapping: MaterialMapping = {
      alias,
      normalizedAlias: normalizeName(alias),
      epdId: epd.id,
    };

    // Always keep the selected EPD in current React state so the current
    // calculation can continue. Persistent caching is permission-gated.
    setEpds((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]));
      map.set(epd.id, epd);
      const next = Array.from(map.values());

      if (epd.source !== "EC3" || EC3_PERSISTENCE_ALLOWED) {
        localStorage.setItem("lca_v2_epd_cache", JSON.stringify(next));
      }
      return next;
    });

    setMaterialMappings((prev) => {
      const map = new Map(prev.map((item) => [item.normalizedAlias, item]));
      map.set(mapping.normalizedAlias, mapping);
      const next = Array.from(map.values());

      if (epd.source !== "EC3" || EC3_PERSISTENCE_ALLOWED) {
        localStorage.setItem("lca_v2_alias_cache", JSON.stringify(next));
      }
      return next;
    });

    // EC3 free/pilot API terms may not allow storage/caching.
    // In that case the EPD remains usable for this browser session only.
    if (epd.source === "EC3" && !EC3_PERSISTENCE_ALLOWED) {
      return;
    }

    const epdResponse = await fetch("/api/epd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newMaterials: [epdToApiPayload(epd)] }),
    });

    if (!epdResponse.ok) {
      const detail = await epdResponse.text();
      throw new Error(
        `Central EPD save failed (${epdResponse.status}): ${detail}`
      );
    }

    const mappingResponse = await fetch("/api/material-mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alias,
        normalizedAlias: mapping.normalizedAlias,
        epdId: epd.id,
      }),
    });

    if (!mappingResponse.ok) {
      const detail = await mappingResponse.text();
      throw new Error(
        `Material mapping save failed (${mappingResponse.status}): ${detail}`
      );
    }
  };

  const confirmReconciliation = async () => {
    if (!pendingReconciliation) return;
    const allSelected = pendingReconciliation.unknownAliases.every((alias) => selectedEc3[alias]);
    if (!allSelected) return;

    setIsProcessing(true);
    const aliasEpds = new Map<string, EpdRecord>();
    for (const alias of pendingReconciliation.unknownAliases) {
      const searchSelection = selectedEc3[alias];
      let enrichedSelection = searchSelection;

      const selectedId = firstString(
        searchSelection?.id,
        searchSelection?.epd_id,
        searchSelection?.uuid
      );

      // If the search result exposes an openEPD-style ID, enrich the record
      // from the full digital EPD endpoint before it is normalized/stored.
      if (selectedId && /^ec3/i.test(selectedId)) {
        try {
          const detailResponse = await fetch(
            `/api/ec3?id=${encodeURIComponent(selectedId)}`,
            { cache: "no-store" }
          );

          if (detailResponse.ok) {
            const detailJson = await detailResponse.json();
            if (detailJson?.data) {
              const detailModules =
                detailJson.data?.modules &&
                Object.keys(detailJson.data.modules).length > 0
                  ? detailJson.data.modules
                  : searchSelection?.modules;

              enrichedSelection = {
                ...searchSelection,
                ...detailJson.data,
                modules: detailModules,
                metadata: {
                  searchResult: searchSelection,
                  openEpdDetail: detailJson.data,
                },
              };
            }
          }
        } catch (error) {
          console.warn(
            `Could not enrich EC3 EPD ${selectedId}; using search result.`,
            error
          );
        }
      }

      const epd = adaptEc3Result(enrichedSelection, alias);
      aliasEpds.set(normalizeName(alias), epd);

      try {
        await persistEpdAndMapping(epd, alias);
      } catch (error) {
        console.error(error);
        alert(
          error instanceof Error
            ? error.message
            : "The EPD could not be saved to the central database."
        );
      }
    }

    const resolvedRows = pendingReconciliation.rows.map((row) => {
      if (row.epdId) return row;
      const epd = aliasEpds.get(normalizeName(row.materialName));
      return epd ? { ...row, epdId: epd.id } : row;
    });

    commitRows(pendingReconciliation.type, resolvedRows);
    setPendingReconciliation(null);
    setSelectedEc3({});
    setEc3SearchResults({});
    setIsProcessing(false);
  };

  const saveAssembly = async () => {
    const valid = assemblyItems.filter((item) => item.epdId && item.qtyDeclared > 0);
    if (!assemblyName.trim() || !valid.length) return alert("Enter an assembly name and at least one component.");

    const modules: Partial<Record<LcaModule, ImpactSet>> = {};
    MODULE_ORDER.forEach((module) => {
      const total = addImpact(
        ...valid.map((item) => scaleImpact(epdById.get(item.epdId)?.modules[module], item.qtyDeclared))
      );
      if (Object.keys(total).length) modules[module] = total;
    });

    const massKg = valid.reduce((sum, item) => {
      const epd = epdById.get(item.epdId);
      return sum + (epd?.massKgPerDeclaredUnit || 0) * item.qtyDeclared;
    }, 0);

    const epd: EpdRecord = {
      id: `assembly-${slugId(assemblyName)}-${Date.now()}`,
      name: assemblyName.trim(),
      aliases: [assemblyName.trim()],
      category: assemblyCategory,
      source: "Custom",
      declaredUnit: assemblyUnit,
      declaredQuantity: 1,
      massKgPerDeclaredUnit: massKg || null,
      referenceServiceLifeYears: Math.min(
        ...valid.map((item) => epdById.get(item.epdId)?.referenceServiceLifeYears || buildingLife)
      ),
      modules,
      metadata: { components: valid },
    };

    await persistEpdAndMapping(epd, assemblyName.trim());
    setAssemblyName("");
    setAssemblyItems([{ epdId: "", qtyDeclared: 1 }]);
    setShowAssemblyBuilder(false);
  };

  const baselineReport = useMemo(
    () => calculateProject(baselineRows, epdById, buildingLife, annualEnergyKwh, gridIntensity),
    [baselineRows, epdById, buildingLife, annualEnergyKwh, gridIntensity]
  );
  const proposedReport = useMemo(
    () => calculateProject(proposedRows, epdById, buildingLife, annualEnergyKwh, gridIntensity),
    [proposedRows, epdById, buildingLife, annualEnergyKwh, gridIntensity]
  );

  const isComparing = !!baselineReport && !!proposedReport;
  const currentReport = activeView === "baseline" ? baselineReport : proposedReport || baselineReport;

  const comparisonMetrics = useMemo(() => {
    if (!baselineReport || !proposedReport) return [];
    const keys: ImpactMetric[] = ["gwp", "acidification", "smog", "eutrophication", "ozone", "energy"];
    return keys.map((metric) => ({
      metric,
      label: metricLabel[metric],
      unit: metricUnit[metric],
      baseline: baselineReport.aToC[metric] ?? null,
      proposed: proposedReport.aToC[metric] ?? null,
      reduction: reductionPct(baselineReport.aToC[metric], proposedReport.aToC[metric]),
    }));
  }, [baselineReport, proposedReport]);

  const leedIndicative = useMemo(() => {
    if (!comparisonMetrics.length) return null;
    const complete = comparisonMetrics.every((metric) => typeof metric.reduction === "number");
    if (!complete) return { complete: false, passes: false, reason: "Missing impact-category data prevents a defensible LEED determination." };
    const reductions = comparisonMetrics.map((metric) => metric.reduction as number);
    const gwpPassed = reductions[0] >= 10;
    const passed10 = reductions.filter((value) => value >= 10).length;
    const failed5 = reductions.some((value) => value < -5);
    return {
      complete: true,
      passes: gwpPassed && passed10 >= 3 && !failed5,
      reason: `GWP ≥10%: ${gwpPassed ? "yes" : "no"}; categories ≥10%: ${passed10}; no category worse than 5%: ${!failed5 ? "yes" : "no"}.`,
    };
  }, [comparisonMetrics]);

  const phaseChartData = useMemo(() => {
    const toRow = (name: string, report: ProjectReport) => ({
      name,
      "A1-A3": report.moduleTotals.A1A3?.gwp || 0,
      A4: report.moduleTotals.A4?.gwp || 0,
      A5: report.moduleTotals.A5?.gwp || 0,
      "B1-B7": ["B1", "B2", "B3", "B4", "B5", "B6", "B7"].reduce(
        (sum, module) => sum + (report.moduleTotals[module as LcaModule]?.gwp || 0),
        0
      ),
      "C1-C4": ["C1", "C2", "C3", "C4"].reduce(
        (sum, module) => sum + (report.moduleTotals[module as LcaModule]?.gwp || 0),
        0
      ),
    });
    const data = [] as any[];
    if (baselineReport) data.push(toRow("Baseline", baselineReport));
    if (proposedReport) data.push(toRow("Proposed", proposedReport));
    return data;
  }, [baselineReport, proposedReport]);

  const crossoverData = useMemo(() => {
    if (!currentReport) return [];
    const embodied =
      (currentReport.moduleTotals.A1A3?.gwp || 0) +
      (currentReport.moduleTotals.A4?.gwp || 0) +
      (currentReport.moduleTotals.A5?.gwp || 0);
    const data = [];
    for (let year = 0; year <= buildingLife; year += Math.max(1, Math.round(buildingLife / 12))) {
      const operational = year * annualEnergyKwh * gridIntensity;
      data.push({ year: `Year ${year}`, Embodied: embodied, Operational: operational, Total: embodied + operational });
    }
    return data;
  }, [currentReport, buildingLife, annualEnergyKwh, gridIntensity]);

  const updateRow = (index: number, patch: Partial<BomRow>) => {
    const setter = activeView === "baseline" ? setBaselineRows : setProposedRows;
    setter((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const exportCsv = () => {
    if (!currentReport) return;
    const rows = currentReport.lines.map((line) => ({
      "Input Material": line.row.materialName,
      "Mapped EPD": line.epd?.name || "UNMAPPED",
      Manufacturer: line.epd?.manufacturer || "",
      Source: line.epd?.source || "",
      "Input Quantity": line.row.quantity,
      "Input Unit": line.row.unit,
      "EPD Declared Quantity": line.declaredQuantity ?? "",
      "EPD Declared Unit": line.epd?.declaredUnit || "",
      "Replacement Count (B4)": line.replacementCount,
      "A1-A3 GWP": line.modules.A1A3?.gwp ?? "",
      "A4 GWP": line.modules.A4?.gwp ?? "",
      "A5 GWP": line.modules.A5?.gwp ?? "",
      "B4 GWP": line.modules.B4?.gwp ?? "",
      "B6 GWP": "Project-level; see total rows",
      "C1-C4 GWP": addImpact(line.modules.C1, line.modules.C2, line.modules.C3, line.modules.C4).gwp ?? "",
      "A-C GWP": line.aToC.gwp ?? "",
      "Module D GWP": line.moduleD.gwp ?? "",
      "A-C + D GWP": line.aToCPlusD.gwp ?? "",
      "Unit Cost": line.row.costPerInputUnit,
      "Line Cost": line.cost,
      "A-C kgCO2e/$": line.carbonPerDollar ?? "",
      Warnings: line.warnings.join(" | "),
    }));

    rows.push({
      "Input Material": "PROJECT TOTAL",
      "Mapped EPD": "",
      Manufacturer: "",
      Source: "",
      "Input Quantity": "" as any,
      "Input Unit": "",
      "EPD Declared Quantity": "",
      "EPD Declared Unit": "",
      "Replacement Count (B4)": "" as any,
      "A1-A3 GWP": currentReport.moduleTotals.A1A3?.gwp ?? "",
      "A4 GWP": currentReport.moduleTotals.A4?.gwp ?? "",
      "A5 GWP": currentReport.moduleTotals.A5?.gwp ?? "",
      "B4 GWP": currentReport.moduleTotals.B4?.gwp ?? "",
      "B6 GWP": String(currentReport.moduleTotals.B6?.gwp ?? ""),
      "C1-C4 GWP": addImpact(
        currentReport.moduleTotals.C1,
        currentReport.moduleTotals.C2,
        currentReport.moduleTotals.C3,
        currentReport.moduleTotals.C4
      ).gwp ?? "",
      "A-C GWP": currentReport.aToC.gwp ?? "",
      "Module D GWP": currentReport.moduleD.gwp ?? "",
      "A-C + D GWP": currentReport.aToCPlusD.gwp ?? "",
      "Unit Cost": "" as any,
      "Line Cost": currentReport.totalCost,
      "A-C kgCO2e/$": currentReport.totalCost > 0 && typeof currentReport.aToC.gwp === "number" ? currentReport.aToC.gwp / currentReport.totalCost : "",
      Warnings: currentReport.warnings.join(" | "),
    });

    const blob = new Blob([Papa.unparse(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LCA_V2_${activeView}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!currentReport) return;
    setIsDownloading(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 38, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("LCA ENGINE V2 REPORT", 14, 18);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Auditable calculation output - Module D reported separately", 14, 27);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("Project Summary", 14, 52);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Study period: ${buildingLife} years`, 14, 61);
      doc.text(`Gross floor area: ${fmt(floorAreaM2, 1)} m²`, 14, 68);
      doc.text(`Mapped rows: ${currentReport.mappedRows}/${currentReport.lines.length}`, 14, 75);
      doc.text(`Mapped quantity share: ${fmt(currentReport.mappedQuantityShare, 1)}%`, 14, 82);
      doc.text(`A-C GWP: ${fmt(currentReport.aToC.gwp, 1)} kg CO2e`, 14, 89);
      doc.text(`A-C GWP intensity: ${floorAreaM2 > 0 && typeof currentReport.aToC.gwp === "number" ? fmt(currentReport.aToC.gwp / floorAreaM2, 2) : "N/A"} kg CO2e/m2`, 14, 96);
      doc.text(`Module D: ${fmt(currentReport.moduleD.gwp, 1)} kg CO2e`, 14, 103);
      doc.text(`Total cost: $${fmt(currentReport.totalCost, 2)}`, 14, 110);

      autoTable(doc, {
        startY: 122,
        head: [["Module", "GWP (kg CO2e)", "Acidification", "Smog", "Energy"]],
        body: MODULE_ORDER.map((module) => [
          module,
          fmt(currentReport.moduleTotals[module]?.gwp, 2),
          fmt(currentReport.moduleTotals[module]?.acidification, 4),
          fmt(currentReport.moduleTotals[module]?.smog, 4),
          fmt(currentReport.moduleTotals[module]?.energy, 1),
        ]),
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42] },
      });

      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Material Inventory", 14, 18);
      autoTable(doc, {
        startY: 26,
        head: [["Input material", "Mapped dataset", "Qty", "A-C GWP", "Warnings"]],
        body: currentReport.lines.map((line) => [
          line.row.materialName,
          line.epd?.name || "UNMAPPED",
          `${fmt(line.row.quantity, 3)} ${line.row.unit}`,
          fmt(line.aToC.gwp, 1),
          line.warnings.join("; "),
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [15, 23, 42] },
      });

      if (currentReport.warnings.length) {
        doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Data Quality / Calculation Warnings", 14, 18);
        autoTable(doc, {
          startY: 26,
          head: [["#", "Warning"]],
          body: currentReport.warnings.map((warning, index) => [index + 1, warning]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [180, 83, 9] },
        });
      }

      doc.save(`LCA_V2_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setIsDownloading(false);
    }
  };

  const totalPages = currentReport ? Math.max(1, Math.ceil(currentReport.lines.length / PAGE_SIZE)) : 1;
  const visibleLines = currentReport?.lines.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) || [];

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 shadow-xl rounded-xl min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 font-bold text-slate-600">Loading LCA datasets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden">
      <input ref={baselineInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, "baseline")} />
      <input ref={proposedInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, "proposed")} />

      {pendingUpload && (
        <Modal title={`Map ${pendingUpload.type} CSV columns`} onClose={() => setPendingUpload(null)}>
          <div className="grid md:grid-cols-3 gap-4">
            {([
              ["material", "Material column"],
              ["quantity", "Quantity column"],
              ["unit", "Unit column"],
            ] as const).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span>
                <select
                  value={columnMapping[key]}
                  onChange={(e) => setColumnMapping((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="mt-2 w-full p-3 border-2 border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="">Select...</option>
                  {pendingUpload.headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setPendingUpload(null)} className="px-5 py-2.5 rounded-lg bg-slate-100 font-bold text-slate-700">Cancel</button>
            <button onClick={confirmMapping} className="px-5 py-2.5 rounded-lg bg-blue-600 font-bold text-white">Continue</button>
          </div>
        </Modal>
      )}

      {pendingReconciliation && (
        <Modal title="Resolve unmapped materials with EC3" onClose={() => setPendingReconciliation(null)} maxWidth="max-w-5xl">
          <p className="text-slate-600 mb-5">
            Keep the original CSV/BIM material name for future auto-mapping, but edit the EC3 search term whenever the BIM name is misspelled, too specific, abbreviated, or produces no useful results.
          </p>
          <div className="space-y-4 max-h-[58vh] overflow-y-auto pr-2">
            {pendingReconciliation.unknownAliases.map((alias) => {
              const results = ec3SearchResults[alias] || [];
              const selected = selectedEc3[alias];
              return (
                <div key={alias} className={`border-2 rounded-xl p-4 ${selected ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
                  <div className="space-y-3">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Original CSV / BIM material
                      </div>
                      <div className="font-black text-slate-900">{alias}</div>
                      <div className="text-xs text-slate-500">
                        Mapping key: {normalizeName(alias)}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor={`ec3-search-${normalizeName(alias)}`}
                        className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5"
                      >
                        EC3 search term — editable
                      </label>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          id={`ec3-search-${normalizeName(alias)}`}
                          type="text"
                          value={ec3SearchQueries[alias] ?? alias}
                          onChange={(e) => {
                            const value = e.target.value;

                            setEc3SearchQueries((prev) => ({
                              ...prev,
                              [alias]: value,
                            }));

                            // Do not leave an old EPD selected after the user
                            // changes the search wording.
                            setSelectedEc3((prev) => {
                              if (!prev[alias]) return prev;
                              const next = { ...prev };
                              delete next[alias];
                              return next;
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              searchEc3(alias, ec3SearchQueries[alias] ?? alias);
                            }
                          }}
                          placeholder="e.g. Concrete, Ready Mix Concrete, Structural Steel"
                          className="flex-1 px-4 py-2.5 border-2 border-slate-300 rounded-lg bg-white text-slate-900 font-semibold outline-none focus:border-blue-500"
                        />

                        <button
                          onClick={() =>
                            searchEc3(alias, ec3SearchQueries[alias] ?? alias)
                          }
                          disabled={
                            isSearchingEc3[alias] ||
                            !(ec3SearchQueries[alias] ?? alias).trim()
                          }
                          className="px-4 py-2.5 rounded-lg bg-slate-900 text-white font-bold text-sm disabled:opacity-50 whitespace-nowrap"
                        >
                          {isSearchingEc3[alias]
                            ? "Searching..."
                            : "Search EC3"}
                        </button>

                        {(ec3SearchQueries[alias] ?? alias) !== alias && (
                          <button
                            type="button"
                            onClick={() => {
                              setEc3SearchQueries((prev) => ({
                                ...prev,
                                [alias]: alias,
                              }));
                              setEc3SearchResults((prev) => {
                                const next = { ...prev };
                                delete next[alias];
                                return next;
                              });
                              setSelectedEc3((prev) => {
                                const next = { ...prev };
                                delete next[alias];
                                return next;
                              });
                            }}
                            className="px-3 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-sm border border-slate-200 whitespace-nowrap"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      <p className="mt-1.5 text-xs text-slate-500">
                        You can simplify or correct the search name without changing
                        the original BIM/CSV alias that will be remembered for future imports.
                      </p>
                    </div>
                  </div>
                  {!!results.length && (
                    <select
                      value={selected ? firstString(selected?.id, selected?.epd_id, selected?.uuid, selected?.name) || "" : ""}
                      onChange={(e) => {
                        const next = results.find((result) => (firstString(result?.id, result?.epd_id, result?.uuid, result?.name) || "") === e.target.value);
                        if (next) setSelectedEc3((prev) => ({ ...prev, [alias]: next }));
                      }}
                      className="mt-4 w-full p-3 border-2 border-blue-300 rounded-lg bg-white text-sm"
                    >
                      <option value="">Select verified EPD...</option>
                      {results.map((result, index) => {
                        const value = firstString(result?.id, result?.epd_id, result?.uuid, result?.name) || String(index);
                        return (
                          <option key={`${value}-${index}`} value={value}>
                            {firstString(result?.name, result?.product_name) || "Unnamed EPD"}
                            {result?.manufacturer ? ` — ${result.manufacturer}` : ""}
                            {nOrNull(result?.gwp) !== null ? ` — ${fmt(nOrNull(result?.gwp), 2)} kgCO₂e/${result?.declared_unit || "unit"}` : ""}
                          </option>
                        );
                      })}
                    </select>
                  )}
                  {results.length === 0 && ec3SearchResults[alias] && !isSearchingEc3[alias] && (
                    <p className="mt-3 text-sm text-amber-700 font-semibold">No results returned. Edit the EC3 search term above and try a simpler or corrected material name.</p>
                  )}
                  {selected && (
                    <div className="mt-3 text-xs font-bold text-emerald-700">
                      Selected dataset will be saved without fabricated lifecycle values; missing modules remain N/A.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => setPendingReconciliation(null)} className="px-5 py-2.5 rounded-lg bg-slate-100 font-bold">Cancel</button>
            <button
              disabled={!pendingReconciliation.unknownAliases.every((alias) => selectedEc3[alias]) || isProcessing}
              onClick={confirmReconciliation}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-40"
            >
              Save mappings & import model
            </button>
          </div>
        </Modal>
      )}

      {showRevitModal && (
        <Modal title="Revit / BIM integration contract" onClose={() => setShowRevitModal(false)}>
          <p className="text-slate-600 mb-4">
            Use stable element IDs and send incremental changes, not a full model on every sync. The server should resolve aliases through the same central mapping table used by CSV imports.
          </p>
          <pre className="bg-slate-950 text-slate-200 rounded-xl p-4 overflow-x-auto text-xs">{`POST /api/webhook/revit
{
  "projectId": "...",
  "modelRevision": "...",
  "elements": [
    {
      "elementId": "123456",
      "category": "Walls",
      "family": "Basic Wall",
      "type": "Exterior Wall",
      "material": "Concrete 4000 PSI",
      "quantity": 42.5,
      "unit": "m3",
      "distanceKm": 120,
      "transportMode": "truck"
    }
  ],
  "deletedElementIds": []
}`}</pre>
        </Modal>
      )}

      {showAssemblyBuilder && (
        <Modal title="Custom assembly builder" onClose={() => setShowAssemblyBuilder(false)}>
          <div className="grid sm:grid-cols-3 gap-4">
            <input value={assemblyName} onChange={(e) => setAssemblyName(e.target.value)} placeholder="Assembly name" className="p-3 border-2 border-slate-300 rounded-lg" />
            <select value={assemblyCategory} onChange={(e) => setAssemblyCategory(e.target.value)} className="p-3 border-2 border-slate-300 rounded-lg">
              {CSI_DIVISIONS.map((division) => <option key={division}>{division}</option>)}
            </select>
            <input value={assemblyUnit} onChange={(e) => setAssemblyUnit(e.target.value)} placeholder="Declared unit" className="p-3 border-2 border-slate-300 rounded-lg" />
          </div>
          <div className="mt-5 space-y-3">
            {assemblyItems.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_130px_40px] gap-3 items-center">
                <select
                  value={item.epdId}
                  onChange={(e) => setAssemblyItems((prev) => prev.map((x, i) => i === index ? { ...x, epdId: e.target.value } : x))}
                  className="p-3 border-2 border-slate-300 rounded-lg"
                >
                  <option value="">Select component EPD...</option>
                  {epds.map((epd) => <option key={epd.id} value={epd.id}>{epd.name} ({epd.declaredUnit})</option>)}
                </select>
                <input
                  type="number"
                  value={item.qtyDeclared}
                  onChange={(e) => setAssemblyItems((prev) => prev.map((x, i) => i === index ? { ...x, qtyDeclared: n(e.target.value, 0) } : x))}
                  className="p-3 border-2 border-slate-300 rounded-lg"
                />
                <button onClick={() => setAssemblyItems((prev) => prev.filter((_, i) => i !== index))} className="text-red-600 font-black">×</button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between">
            <button onClick={() => setAssemblyItems((prev) => [...prev, { epdId: "", qtyDeclared: 1 }])} className="font-bold text-blue-700">+ Add component</button>
            <button onClick={saveAssembly} className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-bold">Save assembly</button>
          </div>
        </Modal>
      )}

      <header className="bg-slate-950 text-white p-4 sm:p-5 flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
        <div>
          <h2 className="font-black text-lg">Enterprise LCA Engine V2</h2>
          <p className="text-xs text-slate-400">{epds.length.toLocaleString()} datasets · {materialMappings.length.toLocaleString()} saved alias mappings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAssemblyBuilder(true)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-bold">+ Assembly</button>
          <button onClick={() => setShowRevitModal(true)} className="px-3 py-2 bg-indigo-600 rounded-lg text-sm font-bold">BIM Sync</button>
          <button onClick={() => baselineInputRef.current?.click()} className="px-3 py-2 bg-slate-700 rounded-lg text-sm font-bold">{baselineRows.length ? "Replace Baseline" : "Upload Baseline"}</button>
          <button onClick={() => proposedInputRef.current?.click()} className="px-3 py-2 bg-blue-600 rounded-lg text-sm font-bold">{proposedRows.length ? "Replace Proposed" : "Upload Proposed"}</button>
        </div>
      </header>

      {isProcessing && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 text-sm font-bold text-blue-800">Processing model...</div>
      )}

      {!baselineRows.length && !proposedRows.length ? (
        <div className="min-h-[560px] flex items-center justify-center p-6">
          <div className="max-w-4xl w-full text-center">
            <h3 className="text-3xl font-black text-slate-900">Start an auditable LCA</h3>
            <p className="mt-3 text-slate-500">Upload a model, map quantities to declared units, then resolve unmapped products with verified datasets.</p>
            <div className="grid md:grid-cols-3 gap-5 mt-10">
              <WorkflowCard title="Single model" text="Upload a proposed design and calculate A-D modules, cost and data-quality warnings." onClick={() => proposedInputRef.current?.click()} />
              <WorkflowCard title="Baseline comparison" text="Upload baseline and proposed models for impact-category reductions." onClick={() => baselineInputRef.current?.click()} />
              <WorkflowCard title="BIM sync" text="Use a server-side Revit/IFC adapter with stable element IDs and central alias mapping." onClick={() => setShowRevitModal(true)} />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-slate-50 border-b border-slate-200 p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <NumberField label="Study period (years)" value={buildingLife} onChange={setBuildingLife} />
            <NumberField label="Gross floor area (m²)" value={floorAreaM2} onChange={setFloorAreaM2} />
            <NumberField label="Annual energy (kWh)" value={annualEnergyKwh} onChange={setAnnualEnergyKwh} />
            <NumberField label="Grid intensity (kg/kWh)" value={gridIntensity} onChange={setGridIntensity} step={0.01} />
            <div className="flex gap-2 items-end">
              <button onClick={exportCsv} className="flex-1 p-2.5 border border-blue-300 text-blue-700 bg-white rounded-lg font-bold text-sm">CSV</button>
              <button onClick={exportPdf} disabled={isDownloading} className="flex-1 p-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm">PDF</button>
            </div>
          </div>

          {isComparing && (
            <div className="p-4 border-b border-slate-200 flex flex-wrap gap-2 bg-white">
              {(["baseline", "proposed", "comparison"] as ActiveView[]).map((view) => (
                <button
                  key={view}
                  onClick={() => { setActiveView(view); setPage(0); }}
                  className={`px-4 py-2 rounded-lg text-sm font-black capitalize ${activeView === view ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {view}
                </button>
              ))}
            </div>
          )}

          <nav className="flex overflow-x-auto bg-slate-50 border-b border-slate-200">
            {(["overview", "materials", "use", "procurement", "quality"] as DashboardTab[]).map((item) => (
              <button
                key={item}
                onClick={() => { setTab(item); setPage(0); }}
                className={`px-5 py-3.5 whitespace-nowrap text-sm font-black capitalize border-b-2 ${tab === item ? "border-blue-600 text-blue-700 bg-white" : "border-transparent text-slate-500"}`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="p-4 sm:p-6 bg-slate-50 min-h-[600px]">
            {activeView === "comparison" && isComparing ? (
              <ComparisonPanel
                baseline={baselineReport!}
                proposed={proposedReport!}
                metrics={comparisonMetrics}
                leedIndicative={leedIndicative}
                floorAreaM2={floorAreaM2}
                phaseChartData={phaseChartData}
              />
            ) : currentReport ? (
              <>
                {tab === "overview" && (
                  <OverviewPanel report={currentReport} floorAreaM2={floorAreaM2} phaseChartData={phaseChartData} activeView={activeView} />
                )}

                {tab === "use" && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h3 className="font-black text-lg text-slate-900">Embodied vs operational carbon</h3>
                    <p className="text-sm text-slate-500 mt-1">B6 uses the project-level annual energy and grid intensity entered above.</p>
                    <div className="h-[420px] mt-5">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={crossoverData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="year" />
                          <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                          <RechartsTooltip formatter={(v: any) => `${fmt(Number(v), 0)} kg CO₂e`} />
                          <Legend />
                          <Line type="monotone" dataKey="Embodied" stroke="#2563eb" strokeWidth={3} />
                          <Line type="monotone" dataKey="Operational" stroke="#10b981" strokeWidth={3} />
                          <Line type="monotone" dataKey="Total" stroke="#ef4444" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {(tab === "materials" || tab === "procurement") && (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-900">{tab === "procurement" ? "Cost-carbon bid leveling" : "Material inventory"}</h3>
                        <p className="text-xs text-slate-500">Rows {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, currentReport.lines.length)} of {currentReport.lines.length}</p>
                      </div>
                      <div className="flex gap-2">
                        <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="px-3 py-1.5 bg-slate-100 rounded disabled:opacity-30">Previous</button>
                        <span className="px-3 py-1.5 text-sm font-bold">{page + 1}/{totalPages}</span>
                        <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} className="px-3 py-1.5 bg-slate-100 rounded disabled:opacity-30">Next</button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1000px] text-sm">
                        <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
                          <tr>
                            <th className="p-3 text-left">Input material / EPD</th>
                            <th className="p-3 text-right">Quantity</th>
                            <th className="p-3 text-right">Distance</th>
                            <th className="p-3 text-right">A-C GWP</th>
                            <th className="p-3 text-right">Module D</th>
                            {tab === "procurement" && <th className="p-3 text-right">Unit cost</th>}
                            {tab === "procurement" && <th className="p-3 text-right">kgCO₂e/$</th>}
                            <th className="p-3 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleLines.map((line, localIndex) => {
                            const realIndex = page * PAGE_SIZE + localIndex;
                            return (
                              <tr key={line.row.id} className="border-t border-slate-100 align-top">
                                <td className="p-3">
                                  <div className="font-black text-slate-900">{line.row.materialName}</div>
                                  <div className="text-xs text-slate-500">{line.epd?.name || "UNMAPPED"}</div>
                                  {line.epd && <div className="text-[10px] uppercase font-bold text-blue-600 mt-1">{line.epd.source} · {line.epd.declaredUnit}</div>}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex justify-end items-center gap-2">
                                    <input type="number" value={line.row.quantity} onChange={(e) => updateRow(realIndex, { quantity: n(e.target.value, 0) })} className="w-24 p-1.5 border rounded text-right font-mono" />
                                    <span className="text-xs text-slate-500">{line.row.unit}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-right">
                                  <input type="number" value={line.row.distanceKm} onChange={(e) => updateRow(realIndex, { distanceKm: n(e.target.value, 0) })} className="w-20 p-1.5 border rounded text-right font-mono" />
                                  <span className="ml-1 text-xs">km</span>
                                </td>
                                <td className="p-3 text-right font-mono font-bold">{fmt(line.aToC.gwp, 1)}</td>
                                <td className="p-3 text-right font-mono text-emerald-700">{fmt(line.moduleD.gwp, 1)}</td>
                                {tab === "procurement" && (
                                  <td className="p-3 text-right">
                                    <input type="number" value={line.row.costPerInputUnit || ""} onChange={(e) => updateRow(realIndex, { costPerInputUnit: n(e.target.value, 0) })} className="w-24 p-1.5 border border-indigo-300 rounded text-right font-mono" placeholder="$/unit" />
                                  </td>
                                )}
                                {tab === "procurement" && <td className="p-3 text-right font-mono font-black text-indigo-700">{fmt(line.carbonPerDollar, 3)}</td>}
                                <td className="p-3">
                                  {line.warnings.length ? (
                                    <span title={line.warnings.join("\n")} className="inline-flex px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-black">Warning</span>
                                  ) : (
                                    <span className="inline-flex px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-black">OK</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {tab === "quality" && (
                  <QualityPanel report={currentReport} epds={epds} mappings={materialMappings} />
                )}
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function OverviewPanel({ report, floorAreaM2, phaseChartData, activeView }: { report: ProjectReport; floorAreaM2: number; phaseChartData: any[]; activeView: ActiveView }) {
  const intensity = floorAreaM2 > 0 && typeof report.aToC.gwp === "number" ? report.aToC.gwp / floorAreaM2 : null;
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Kpi label="A-C GWP" value={`${fmt(report.aToC.gwp, 0)} kg CO₂e`} />
        <Kpi label="GWP intensity" value={`${fmt(intensity, 2)} kg CO₂e/m²`} />
        <Kpi label="Module D" value={`${fmt(report.moduleD.gwp, 0)} kg CO₂e`} />
        <Kpi label="Mapped quantity" value={`${fmt(report.mappedQuantityShare, 1)}%`} />
        <Kpi label="Project cost" value={`$${fmt(report.totalCost, 2)}`} />
      </div>

      <div className="grid xl:grid-cols-[2fr_1fr] gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-black text-slate-900">Lifecycle GWP by stage</h3>
          <p className="text-xs text-slate-500 mt-1">Module D is intentionally excluded from the stacked A-C chart.</p>
          <div className="h-[380px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseChartData.filter((row) => row.name.toLowerCase() === activeView || activeView === "comparison")}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <RechartsTooltip formatter={(v: any) => `${fmt(Number(v), 0)} kg CO₂e`} />
                <Legend />
                <Bar dataKey="A1-A3" stackId="a" fill="#2563eb" />
                <Bar dataKey="A4" stackId="a" fill="#f59e0b" />
                <Bar dataKey="A5" stackId="a" fill="#fb7185" />
                <Bar dataKey="B1-B7" stackId="a" fill="#10b981" />
                <Bar dataKey="C1-C4" stackId="a" fill="#64748b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-black text-slate-900">Module totals</h3>
          <div className="mt-4 space-y-2 max-h-[380px] overflow-y-auto">
            {MODULE_ORDER.map((module) => (
              <div key={module} className="flex justify-between gap-3 border-b border-slate-100 pb-2 text-sm">
                <span className={`font-black ${module === "D" ? "text-emerald-700" : "text-slate-700"}`}>{module}</span>
                <span className="font-mono text-slate-600">{fmt(report.moduleTotals[module]?.gwp, 2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonPanel({ baseline, proposed, metrics, leedIndicative, floorAreaM2, phaseChartData }: any) {
  const baselineIntensity = floorAreaM2 > 0 && typeof baseline.aToC.gwp === "number" ? baseline.aToC.gwp / floorAreaM2 : null;
  const proposedIntensity = floorAreaM2 > 0 && typeof proposed.aToC.gwp === "number" ? proposed.aToC.gwp / floorAreaM2 : null;
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Kpi label="Baseline A-C GWP intensity" value={`${fmt(baselineIntensity, 2)} kg CO₂e/m²`} />
        <Kpi label="Proposed A-C GWP intensity" value={`${fmt(proposedIntensity, 2)} kg CO₂e/m²`} />
        <Kpi label="GWP reduction" value={`${fmt(reductionPct(baseline.aToC.gwp, proposed.aToC.gwp), 2)}%`} />
      </div>

      <div className={`border-2 rounded-xl p-5 ${leedIndicative?.complete && leedIndicative?.passes ? "bg-emerald-50 border-emerald-300" : "bg-amber-50 border-amber-300"}`}>
        <h3 className="font-black text-slate-900">Indicative LEED v4 logic check</h3>
        <p className="text-sm text-slate-700 mt-1">{leedIndicative?.reason || "Comparison unavailable."}</p>
        <p className="text-xs text-slate-500 mt-2">This is intentionally labeled indicative until the calculation core, datasets, functional equivalence and reporting workflow are independently validated.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr><th className="p-3 text-left">Impact category</th><th className="p-3 text-right">Baseline</th><th className="p-3 text-right">Proposed</th><th className="p-3 text-right">Reduction</th></tr>
            </thead>
            <tbody>
              {metrics.map((metric: any) => (
                <tr key={metric.metric} className="border-t border-slate-100">
                  <td className="p-3 font-black">{metric.label}</td>
                  <td className="p-3 text-right font-mono">{fmt(metric.baseline, 3)} {metric.unit}</td>
                  <td className="p-3 text-right font-mono">{fmt(metric.proposed, 3)} {metric.unit}</td>
                  <td className="p-3 text-right font-mono font-black">{fmt(metric.reduction, 2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={phaseChartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <RechartsTooltip formatter={(v: any) => `${fmt(Number(v), 0)} kg CO₂e`} />
            <Legend />
            <Bar dataKey="A1-A3" stackId="a" fill="#2563eb" />
            <Bar dataKey="A4" stackId="a" fill="#f59e0b" />
            <Bar dataKey="A5" stackId="a" fill="#fb7185" />
            <Bar dataKey="B1-B7" stackId="a" fill="#10b981" />
            <Bar dataKey="C1-C4" stackId="a" fill="#64748b" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function QualityPanel({ report, epds, mappings }: { report: ProjectReport; epds: EpdRecord[]; mappings: MaterialMapping[] }) {
  const ec3Count = epds.filter((epd) => epd.source === "EC3").length;
  const completeGwp = report.lines.filter((line) => typeof line.aToC.gwp === "number").length;
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <Kpi label="Mapped rows" value={`${report.mappedRows}/${report.lines.length}`} />
        <Kpi label="Rows with A-C GWP" value={`${completeGwp}/${report.lines.length}`} />
        <Kpi label="EC3 datasets cached" value={ec3Count.toLocaleString()} />
        <Kpi label="Alias mappings" value={mappings.length.toLocaleString()} />
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-black text-slate-900">Warnings</h3>
        {report.warnings.length ? (
          <div className="mt-4 space-y-2 max-h-[450px] overflow-y-auto">
            {report.warnings.map((warning, index) => (
              <div key={`${warning}-${index}`} className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">{warning}</div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-emerald-700 font-bold">No row-level calculation warnings.</p>
        )}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children, maxWidth = "max-w-3xl" }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[92vh] overflow-hidden flex flex-col`}>
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-2xl font-black text-slate-400 hover:text-red-500">×</button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function WorkflowCard({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 rounded-xl p-6 transition-all">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-black text-blue-700">LCA</div>
      <h4 className="mt-4 text-lg font-black text-slate-900">{title}</h4>
      <p className="mt-2 text-sm text-slate-500 leading-relaxed">{text}</p>
    </button>
  );
}

function NumberField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (value: number) => void; step?: number }) {
  return (
    <label>
      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      <input type="number" step={step} value={value} onChange={(e) => onChange(n(e.target.value, 0))} className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg font-mono font-bold text-slate-900" />
    </label>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-slate-900 break-words">{value}</div>
    </div>
  );
}
