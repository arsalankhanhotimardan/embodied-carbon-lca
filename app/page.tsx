"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AnonymousWorkspacePanel from "@/components/AnonymousWorkspacePanel";
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
// Project persistence:
// - POST /api/lca/projects
// - GET/PUT/DELETE /api/lca/projects/[id]
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
  declaredUnitWasMissing?: boolean;
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
  transportModeWasDefaulted?: boolean;
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
  epdMatchedRows: number;
  calculableRows: number;
  rowsWithGwp: number;
  rowsWithCompleteCoreGwp: number;
  epdMatchShare: number;
  calculableShare: number;
  gwpRowShare: number;
  coreGwpCompleteShare: number;
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
  sourceFileName: string;
}

interface PendingReconciliation {
  type: ModelType;
  rows: BomRow[];
  unknownAliases: string[];
  sourceFileName: string;
}

interface SavedProjectRef {
  id: string;
  name: string;
  editToken: string;
  updatedAt?: string;
}

interface SavedProjectPayload {
  id: string;
  name: string;
  schemaVersion: number;
  appVersion: string;
  calculationEngineVersion: string;
  studyPeriodYears: number;
  floorAreaM2: number;
  annualEnergyKwh: number;
  gridIntensity: number;
  baselineRows: BomRow[];
  proposedRows: BomRow[];
  metadata?: {
    baselineSourceName?: string | null;
    proposedSourceName?: string | null;
    baselineFingerprint?: string | null;
    proposedFingerprint?: string | null;
    ec3SessionOnlyRows?: number;
  };
  createdAt?: string;
  updatedAt?: string;
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

// Conservative report-completeness boundary used for data-quality gating.
// This is a reporting safeguard, not a claim that every certification scheme
// requires the exact same set of modules.
const CORE_GWP_BOUNDARY: LcaModule[] = [
  "A1A3",
  "A4",
  "A5",
  "C1",
  "C2",
  "C3",
  "C4",
];
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

const LCA_APP_VERSION = "LCA-V2.7";
const LCA_CALC_ENGINE_VERSION = "LCA-V2.5";
const PROJECT_INDEX_KEY = "lca_v2_6_saved_projects";

const modelFingerprint = (rows: BomRow[]): string => {
  const normalized = rows
    .map((row) => [
      normalizeName(row.materialName),
      Number(row.quantity.toFixed(9)),
      canonicalUnit(row.unit),
      Number(row.distanceKm.toFixed(6)),
      row.mode,
      row.thicknessM == null ? null : Number(row.thicknessM.toFixed(9)),
      row.epdId || "",
      Number(row.costPerInputUnit.toFixed(6)),
    ])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

  const source = JSON.stringify(normalized);
  let hash = 2166136261;

  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
};

const safeLocalStorageSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Local cache "${key}" could not be updated.`, error);
  }
};

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

const splitQuantityAndUnit = (
  raw: string | undefined | null
): { quantityFromUnit: number | null; unitText: string; wasMissing: boolean } => {
  const original = String(raw ?? "").trim();
  if (!original) {
    return { quantityFromUnit: null, unitText: "unit", wasMissing: true };
  }

  const normalized = original
    .replace(/,/g, "")
    .replace(/[×x]\s*10\^?\s*([+-]?\d+)/gi, "e$1")
    .trim();

  // EPD feeds sometimes combine the reference quantity and unit in one field,
  // e.g. "1 metric ton", "1.0 tonne", or "1000 kg".
  const match = normalized.match(
    /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)\s*(.+)$/i
  );

  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > 0 && match[2].trim()) {
      return {
        quantityFromUnit: parsed,
        unitText: match[2].trim(),
        wasMissing: false,
      };
    }
  }

  return { quantityFromUnit: null, unitText: original, wasMissing: false };
};

const canonicalUnit = (raw: string): string => {
  const basis = splitQuantityAndUnit(raw);
  const v = basis.unitText
    .toLowerCase()
    .trim()
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/[·*]/g, "")
    .replace(/\./g, "")
    .replace(/[\s_-]+/g, "");

  const aliases: Record<string, string> = {
    g: "g",
    gram: "g",
    grams: "g",
    kg: "kg",
    kilogram: "kg",
    kilograms: "kg",
    kilogramme: "kg",
    kilogrammes: "kg",
    t: "t",
    ton: "t",
    tons: "t",
    tonne: "t",
    tonnes: "t",
    metricton: "t",
    metrictons: "t",
    metrictonne: "t",
    metrictonnes: "t",
    lb: "lb",
    lbs: "lb",
    pound: "lb",
    pounds: "lb",
    oz: "oz",
    ounce: "oz",
    ounces: "oz",

    m3: "m3",
    "m^3": "m3",
    cbm: "m3",
    cubicmeter: "m3",
    cubicmeters: "m3",
    cubicmetre: "m3",
    cubicmetres: "m3",
    ft3: "ft3",
    "ft^3": "ft3",
    cubicfoot: "ft3",
    cubicfeet: "ft3",
    yd3: "yd3",
    "yd^3": "yd3",
    cubicyard: "yd3",
    cubicyards: "yd3",
    l: "l",
    liter: "l",
    liters: "l",
    litre: "l",
    litres: "l",

    m2: "m2",
    "m^2": "m2",
    sqm: "m2",
    squaremeter: "m2",
    squaremeters: "m2",
    squaremetre: "m2",
    squaremetres: "m2",
    ft2: "ft2",
    "ft^2": "ft2",
    sqft: "ft2",
    squarefoot: "ft2",
    squarefeet: "ft2",
    yd2: "yd2",
    "yd^2": "yd2",
    squareyard: "yd2",
    squareyards: "yd2",

    mm: "mm",
    millimeter: "mm",
    millimeters: "mm",
    millimetre: "mm",
    millimetres: "mm",
    cm: "cm",
    centimeter: "cm",
    centimeters: "cm",
    centimetre: "cm",
    centimetres: "cm",
    m: "m",
    meter: "m",
    meters: "m",
    metre: "m",
    metres: "m",
    in: "in",
    inch: "in",
    inches: "in",
    ft: "ft",
    foot: "ft",
    feet: "ft",

    unit: "unit",
    units: "unit",
    ea: "unit",
    each: "unit",
    pcs: "unit",
    pc: "unit",
    piece: "unit",
    pieces: "unit",
  };

  return aliases[v] || v;
};

type UnitDimension = "mass" | "volume" | "area" | "length" | "count" | "unknown";

const unitInfo = (unitRaw: string): { unit: string; dimension: UnitDimension; toSI: number } => {
  const unit = canonicalUnit(unitRaw);
  const info: Record<string, { dimension: UnitDimension; toSI: number }> = {
    g: { dimension: "mass", toSI: 0.001 },
    kg: { dimension: "mass", toSI: 1 },
    t: { dimension: "mass", toSI: 1000 },
    lb: { dimension: "mass", toSI: 0.45359237 },
    oz: { dimension: "mass", toSI: 0.028349523125 },

    m3: { dimension: "volume", toSI: 1 },
    ft3: { dimension: "volume", toSI: 0.028316846592 },
    yd3: { dimension: "volume", toSI: 0.764554857984 },
    l: { dimension: "volume", toSI: 0.001 },

    m2: { dimension: "area", toSI: 1 },
    ft2: { dimension: "area", toSI: 0.09290304 },
    yd2: { dimension: "area", toSI: 0.83612736 },

    mm: { dimension: "length", toSI: 0.001 },
    cm: { dimension: "length", toSI: 0.01 },
    m: { dimension: "length", toSI: 1 },
    in: { dimension: "length", toSI: 0.0254 },
    ft: { dimension: "length", toSI: 0.3048 },

    unit: { dimension: "count", toSI: 1 },
  };
  return { unit, ...(info[unit] || { dimension: "unknown", toSI: 1 }) };
};

const normalizeDeclaredBasis = (
  rawUnit: string | undefined,
  explicitQuantity: number | null
): { declaredUnit: string; declaredQuantity: number; declaredUnitWasMissing: boolean } => {
  const parsed = splitQuantityAndUnit(rawUnit);
  const explicit =
    typeof explicitQuantity === "number" && Number.isFinite(explicitQuantity) && explicitQuantity > 0
      ? explicitQuantity
      : null;

  // If the API/database returned its generic default of 1 but the unit string
  // itself clearly declares another basis (e.g. "1000 kg"), preserve the basis
  // encoded in the unit string.
  const declaredQuantity =
    parsed.quantityFromUnit && (!explicit || explicit === 1)
      ? parsed.quantityFromUnit
      : explicit ?? parsed.quantityFromUnit ?? 1;

  return {
    declaredUnit: parsed.unitText || "unit",
    declaredQuantity,
    declaredUnitWasMissing: parsed.wasMissing,
  };
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

  if (!Number.isFinite(quantity) || quantity < 0) {
    return {
      value: null,
      warning: `Quantity "${quantity}" is invalid. Use a non-negative finite project quantity.`,
    };
  }

  if (epd.declaredUnitWasMissing) {
    return {
      value: null,
      warning:
        "The selected dataset does not report a usable declared unit. Select another EPD or correct the dataset metadata before calculating.",
    };
  }

  if (from.dimension === "unknown") {
    return {
      value: null,
      warning: `Input unit "${fromUnitRaw}" is not supported. Correct the CSV/BIM unit mapping.`,
    };
  }

  if (to.dimension === "unknown") {
    return {
      value: null,
      warning: `EPD declared unit "${toUnitRaw}" is not supported. Select another EPD or correct the dataset metadata.`,
    };
  }

  if (from.unit === to.unit) return { value: quantity };

  if (from.dimension === to.dimension) {
    const si = quantity * from.toSI;
    return { value: si / to.toSI };
  }

  const density =
    typeof epd.densityKgM3 === "number" && epd.densityKgM3 > 0
      ? epd.densityKgM3
      : null;
  const thickness =
    typeof row.thicknessM === "number" && row.thicknessM > 0
      ? row.thicknessM
      : null;
  const massPerDeclaredUnit =
    typeof epd.massKgPerDeclaredUnit === "number" && epd.massKgPerDeclaredUnit > 0
      ? epd.massKgPerDeclaredUnit
      : null;

  // Count <-> mass when the EPD reports a mass per declared unit.
  if (massPerDeclaredUnit) {
    if (from.dimension === "mass" && to.dimension === "count") {
      const kg = quantity * from.toSI;
      return { value: kg / massPerDeclaredUnit / to.toSI };
    }
    if (from.dimension === "count" && to.dimension === "mass") {
      const count = quantity * from.toSI;
      const kg = count * massPerDeclaredUnit;
      return { value: kg / to.toSI };
    }
  }

  // Mass <-> volume using dataset/material density.
  if (density) {
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
  if (thickness) {
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

  // Area <-> mass requires both thickness and density.
  if (thickness && density) {
    if (from.dimension === "area" && to.dimension === "mass") {
      const m2 = quantity * from.toSI;
      const kg = m2 * thickness * density;
      return { value: kg / to.toSI };
    }
    if (from.dimension === "mass" && to.dimension === "area") {
      const kg = quantity * from.toSI;
      const m2 = kg / density / thickness;
      return { value: m2 / to.toSI };
    }
  }

  if (to.dimension === "count") {
    return {
      value: null,
      warning: `The selected EPD uses a count-based declared unit ("${toUnitRaw}"), but the project quantity is ${fromUnitRaw}. A verified mass-per-unit or compatible count quantity is required.`,
    };
  }

  const needsDensity =
    (from.dimension === "mass" && to.dimension === "volume") ||
    (from.dimension === "volume" && to.dimension === "mass");
  const needsThickness =
    (from.dimension === "area" && to.dimension === "volume") ||
    (from.dimension === "volume" && to.dimension === "area");
  const needsBoth =
    (from.dimension === "area" && to.dimension === "mass") ||
    (from.dimension === "mass" && to.dimension === "area");

  const requirement = needsBoth
    ? "verified density and thickness"
    : needsDensity
    ? "verified density"
    : needsThickness
    ? "thickness"
    : "a compatible declared unit";

  return {
    value: null,
    warning: `Cannot convert ${quantity} ${fromUnitRaw} to EPD declared unit ${toUnitRaw}. This conversion requires ${requirement}; no value was assumed.`,
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

  if (
    from.dimension === "area" &&
    row.thicknessM &&
    row.thicknessM > 0 &&
    epd.densityKgM3 &&
    epd.densityKgM3 > 0
  ) {
    return row.quantity * from.toSI * row.thicknessM * epd.densityKgM3;
  }

  if (
    declaredQuantity !== null &&
    epd.massKgPerDeclaredUnit &&
    epd.massKgPerDeclaredUnit > 0
  ) {
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

const moduleKeyCandidates = (module: LcaModule): string[] => {
  if (module === "A1A3") {
    return ["A1A3", "A1-A3", "A1_A3", "A1/A3", "a1a3", "a1-a3", "a1_a3"];
  }
  return [module, module.toLowerCase()];
};

const compactImpact = (impact: Partial<Record<ImpactMetric, unknown>> | undefined | null): ImpactSet => {
  const out: ImpactSet = {};
  if (!impact) return out;
  METRICS.forEach((metric) => {
    const value = nOrNull(impact[metric]);
    if (value !== null) out[metric] = value;
  });
  return out;
};

const moduleValue = (
  raw: any,
  module: LcaModule,
  metric: ImpactMetric,
  aliases: string[] = []
): number | null => {
  const candidates: unknown[] = [];
  const containers = [
    raw?.modules,
    raw?.impacts,
    raw?.lca_modules,
    raw?.lifecycle_modules,
  ];

  for (const container of containers) {
    if (!container || typeof container !== "object") continue;
    for (const key of moduleKeyCandidates(module)) {
      candidates.push(container?.[key]?.[metric]);
    }

    // Some digital EPD payloads expose A1, A2 and A3 separately rather than
    // a pre-combined A1-A3 object. Only aggregate when all three values exist.
    if (module === "A1A3") {
      const split = ["A1", "A2", "A3"].map((key) =>
        firstNumber(
          container?.[key]?.[metric],
          container?.[key.toLowerCase()]?.[metric]
        )
      );
      if (split.every((value) => value !== null)) {
        candidates.push((split as number[]).reduce((sum, value) => sum + value, 0));
      }
    }
  }

  aliases.forEach((alias) => {
    if (!alias) return;
    candidates.push(raw?.[alias]);
    candidates.push(raw?.[alias.toLowerCase()]);
  });

  return firstNumber(...candidates);
};

const extractModuleImpact = (raw: any, module: LcaModule): ImpactSet => {
  const impact: Partial<Record<ImpactMetric, unknown>> = {};
  METRICS.forEach((metric) => {
    const value = moduleValue(raw, module, metric);
    if (value !== null) impact[metric] = value;
  });
  return compactImpact(impact);
};

const hasNumericImpact = (impact: ImpactSet | undefined, metric?: ImpactMetric): boolean => {
  if (!impact) return false;
  if (metric) {
    const value = impact[metric];
    return typeof value === "number" && Number.isFinite(value);
  }
  return METRICS.some((key) => {
    const value = impact[key];
    return typeof value === "number" && Number.isFinite(value);
  });
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

  const rawDeclaredUnit = firstString(raw?.declaredUnit, raw?.declared_unit, raw?.unit);
  const explicitDeclaredQuantity = firstNumber(
    raw?.declaredQuantity,
    raw?.declared_quantity,
    raw?.reference_quantity
  );
  const basis = normalizeDeclaredBasis(rawDeclaredUnit, explicitDeclaredQuantity);

  const legacyA1A3: ImpactSet = compactImpact({
    // `gwp` is intentionally accepted as A1-A3 only for legacy/simple records.
    // It is never copied into other lifecycle modules.
    gwp: firstNumber(
      raw?.gwp_a1a3,
      raw?.gwp_mfg,
      raw?.gwp,
      raw?.phases?.manufacturing
    ),
    gwpFossil: firstNumber(raw?.gwp_fossil, raw?.gwpFossil),
    gwpBiogenic: firstNumber(raw?.gwp_biogenic, raw?.biogenic),
    gwpLuluc: firstNumber(raw?.gwp_luluc, raw?.gwpLuluc),
    acidification: firstNumber(raw?.traci_acidification, raw?.traci?.acidification),
    smog: firstNumber(raw?.traci_smog, raw?.traci?.smog),
    eutrophication: firstNumber(raw?.traci_eutrophication, raw?.traci?.eutrophication),
    ozone: firstNumber(raw?.traci_ozone, raw?.traci?.ozone),
    energy: firstNumber(raw?.traci_energy, raw?.traci?.energy),
  });

  const modules: Partial<Record<LcaModule, ImpactSet>> = {};
  MODULE_ORDER.forEach((module) => {
    const impact = extractModuleImpact(raw, module);
    if (Object.keys(impact).length) modules[module] = impact;
  });

  if (Object.keys(legacyA1A3).length) {
    modules.A1A3 = {
      ...legacyA1A3,
      ...(modules.A1A3 || {}),
    };
  }

  const legacySingleModuleGwp: Partial<Record<LcaModule, number | null>> = {
    A5: firstNumber(raw?.gwp_a5, raw?.gwp_con, raw?.phases?.construction),
    B1: firstNumber(raw?.gwp_b1, raw?.gwp_use, raw?.phases?.use),
    C4: firstNumber(raw?.gwp_c4, raw?.gwp_eol, raw?.phases?.eol),
  };

  (["A5", "B1", "C4"] as LcaModule[]).forEach((module) => {
    const gwp = legacySingleModuleGwp[module];
    if (gwp !== null && gwp !== undefined && !hasNumericImpact(modules[module], "gwp")) {
      modules[module] = { ...(modules[module] || {}), gwp };
    }
  });

  const aliases = Array.from(
    new Set([
      name,
      ...(Array.isArray(raw?.aliases)
        ? raw.aliases.filter((x: unknown): x is string => typeof x === "string")
        : []),
      ...(Array.isArray(raw?.material_aliases)
        ? raw.material_aliases.filter((x: unknown): x is string => typeof x === "string")
        : []),
    ])
  );

  const rawSource = String(raw?.source || "").trim();
  const source: EpdRecord["source"] =
    rawSource === "EC3"
      ? "EC3"
      : rawSource === "Custom"
      ? "Custom"
      : rawSource === "Generic"
      ? "Generic"
      : rawSource === "EPD"
      ? "EPD"
      : Object.keys(modules).length
      ? "EPD"
      : "Legacy";

  return {
    id,
    name,
    aliases,
    manufacturer: firstString(raw?.manufacturer, raw?.manufacturer_name),
    category: guessCategory(name, firstString(raw?.category, raw?.csi_category)),
    source,
    declaredUnit: basis.declaredUnit,
    declaredQuantity: basis.declaredQuantity,
    declaredUnitWasMissing:
      Boolean(raw?.declaredUnitWasMissing) ||
      Boolean(raw?.metadata?.declaredUnitWasMissing) ||
      basis.declaredUnitWasMissing,
    massKgPerDeclaredUnit: firstNumber(
      raw?.massKgPerDeclaredUnit,
      raw?.mass_kg_per_declared_unit,
      raw?.weight_kg_per_unit
    ),
    densityKgM3: firstNumber(raw?.densityKgM3, raw?.density_kg_m3, raw?.density),
    referenceServiceLifeYears: firstNumber(
      raw?.referenceServiceLifeYears,
      raw?.reference_service_life_years,
      raw?.rsl_years,
      raw?.lifespan_years,
      raw?.lifespan
    ),
    geography: firstString(raw?.geography, raw?.region),
    plant: firstString(raw?.plant, raw?.facility),
    pcr: firstString(raw?.pcr),
    programOperator: firstString(raw?.programOperator, raw?.program_operator),
    validUntil: firstString(raw?.validUntil, raw?.valid_until, raw?.expiry_date),
    modules,
    metadata:
      raw?.metadata && typeof raw.metadata === "object" ? raw.metadata : raw,
  };
};

const adaptEc3Result = (raw: any, localAlias: string): EpdRecord => {
  const name = firstString(raw?.name, raw?.product_name, raw?.material_name) || localAlias;
  const id = firstString(raw?.id, raw?.epd_id, raw?.uuid) || `ec3-${slugId(name)}`;

  const rawDeclaredUnit = firstString(raw?.declared_unit, raw?.declaredUnit, raw?.unit);
  const explicitDeclaredQuantity = firstNumber(
    raw?.declared_quantity,
    raw?.declaredQuantity,
    raw?.reference_quantity
  );
  const basis = normalizeDeclaredBasis(rawDeclaredUnit, explicitDeclaredQuantity);

  const modules: Partial<Record<LcaModule, ImpactSet>> = {};
  MODULE_ORDER.forEach((module) => {
    const impact: Partial<Record<ImpactMetric, unknown>> = {
      gwp: moduleValue(raw, module, "gwp", [
        `gwp_${module.toLowerCase()}`,
        module === "A1A3" ? "gwp" : "",
      ].filter(Boolean)),
      gwpFossil: moduleValue(raw, module, "gwpFossil", [
        `gwp_fossil_${module.toLowerCase()}`,
      ]),
      gwpBiogenic: moduleValue(raw, module, "gwpBiogenic", [
        `gwp_biogenic_${module.toLowerCase()}`,
      ]),
      gwpLuluc: moduleValue(raw, module, "gwpLuluc", [
        `gwp_luluc_${module.toLowerCase()}`,
      ]),
      acidification: moduleValue(raw, module, "acidification", [
        `acidification_${module.toLowerCase()}`,
      ]),
      smog: moduleValue(raw, module, "smog", [`smog_${module.toLowerCase()}`]),
      eutrophication: moduleValue(raw, module, "eutrophication", [
        `eutrophication_${module.toLowerCase()}`,
      ]),
      ozone: moduleValue(raw, module, "ozone", [`ozone_${module.toLowerCase()}`]),
      energy: moduleValue(raw, module, "energy", [`energy_${module.toLowerCase()}`]),
    };
    const compact = compactImpact(impact);
    if (Object.keys(compact).length) modules[module] = compact;
  });

  // Compatibility with simple EC3 proxy/search responses. A single generic
  // GWP value is treated as A1-A3 ONLY; it is never duplicated into A4/A5/C/D.
  const simpleA1A3 = compactImpact({
    gwp: firstNumber(raw?.gwp, raw?.gwp_a1a3),
    gwpFossil: firstNumber(raw?.gwp_fossil, raw?.gwpFossil),
    gwpBiogenic: firstNumber(raw?.gwp_biogenic, raw?.gwpBiogenic),
    gwpLuluc: firstNumber(raw?.gwp_luluc, raw?.gwpLuluc),
    acidification: firstNumber(raw?.traci_acidification),
    smog: firstNumber(raw?.traci_smog),
    eutrophication: firstNumber(raw?.traci_eutrophication),
    ozone: firstNumber(raw?.traci_ozone),
    energy: firstNumber(raw?.traci_energy),
  });

  if (Object.keys(simpleA1A3).length) {
    modules.A1A3 = {
      ...simpleA1A3,
      ...(modules.A1A3 || {}),
    };
  }

  return {
    id,
    name,
    aliases: Array.from(new Set([name, localAlias])),
    manufacturer: firstString(raw?.manufacturer, raw?.manufacturer_name),
    category: guessCategory(name, firstString(raw?.category)),
    source: "EC3",
    declaredUnit: basis.declaredUnit,
    declaredQuantity: basis.declaredQuantity,
    declaredUnitWasMissing:
      Boolean(raw?.declaredUnitWasMissing) ||
      Boolean(raw?.metadata?.declaredUnitWasMissing) ||
      basis.declaredUnitWasMissing,
    massKgPerDeclaredUnit: firstNumber(
      raw?.mass_kg_per_declared_unit,
      raw?.massKgPerDeclaredUnit,
      raw?.weight_kg_per_unit
    ),
    densityKgM3: firstNumber(raw?.density_kg_m3, raw?.densityKgM3, raw?.density),
    referenceServiceLifeYears: firstNumber(
      raw?.reference_service_life_years,
      raw?.referenceServiceLifeYears,
      raw?.rsl_years,
      raw?.lifespan_years
    ),
    geography: firstString(raw?.geography, raw?.region),
    plant: firstString(raw?.plant, raw?.facility),
    pcr: firstString(raw?.pcr),
    programOperator: firstString(raw?.program_operator, raw?.programOperator),
    validUntil: firstString(raw?.valid_until, raw?.validUntil, raw?.expiry_date),
    modules,
    metadata:
      raw?.metadata && typeof raw.metadata === "object" ? raw.metadata : raw,
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
  metadata: {
    ...(epd.metadata || {}),
    declaredUnitWasMissing: Boolean(epd.declaredUnitWasMissing),
  },
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
  const cost = row.quantity * row.costPerInputUnit;

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
      cost,
      carbonPerDollar: null,
      warnings: ["Material is not mapped to an available EPD/dataset."],
    };
  }

  const converted = convertQuantity(
    row.quantity,
    row.unit,
    epd.declaredUnit,
    epd,
    row
  );
  if (converted.warning) warnings.push(converted.warning);
  const declaredQuantity = converted.value;

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

  const dq = declaredQuantity / Math.max(epd.declaredQuantity, 1e-12);
  const replacementCount = countReplacements(
    buildingLife,
    epd.referenceServiceLifeYears
  );
  const massKg = getMassKg(row, epd, declaredQuantity);
  const modules: Partial<Record<LcaModule, ImpactSet>> = {};

  // Initial product, use and end-of-life stages. Missing values remain missing.
  (
    [
      "A1A3",
      "A5",
      "B1",
      "B2",
      "B3",
      "B5",
      "B7",
      "C1",
      "C2",
      "C3",
      "C4",
    ] as LcaModule[]
  ).forEach((module) => {
    if (epd.modules[module]) {
      const scaled = scaleImpact(epd.modules[module], dq);
      if (Object.keys(scaled).length) modules[module] = scaled;
    }
  });

  // A4 route scenario: only run when the user actually supplied a positive
  // distance. CSVs without a distance field now default to 0 km, not 300 km.
  // Preserve non-GWP EPD A4 indicators when a route scenario is applied.
  if (epd.modules.A4 || row.distanceKm > 0) {
    const a4 = scaleImpact(epd.modules.A4, dq);

    if (row.distanceKm > 0) {
      if (massKg !== null) {
        const factor = TRANSPORT_GWP_KG_PER_TKM[row.mode];
        a4.gwp = (massKg / 1000) * row.distanceKm * factor;
        if (row.transportModeWasDefaulted) {
          warnings.push(
            "A4 transport mode was missing or unsupported; truck was used as a visible planning default. Select/verify the transport mode before formal reporting."
          );
        }
        warnings.push(
          `A4 route GWP uses the calculator's planning ${row.mode} factor (${factor} kg CO2e/t-km) for ${row.distanceKm} km. Review/replace this assumption for formal reporting.`
        );
      } else {
        warnings.push(
          "A4 route GWP could not be calculated because material mass is unknown; EPD A4 (if present) was retained."
        );
      }
    }

    if (Object.keys(a4).length) modules.A4 = a4;
  }

  // B4 replacement package: impacts caused by replacement events during the
  // study period. The initial A modules are not multiplied by replacement count.
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
    const b4 = scaleImpact(replacementPackage, replacementCount);
    if (Object.keys(b4).length) modules.B4 = b4;
  } else if (epd.modules.B4) {
    const b4 = scaleImpact(epd.modules.B4, dq);
    if (Object.keys(b4).length) modules.B4 = b4;
  }

  // Module D is outside the A-C total.
  if (epd.modules.D) {
    const moduleD = scaleImpact(
      epd.modules.D,
      dq * (1 + replacementCount)
    );
    if (Object.keys(moduleD).length) modules.D = moduleD;
  }

  const availableGwpModules = A_TO_C_MODULES.filter((module) =>
    hasNumericImpact(modules[module], "gwp")
  );

  if (!hasNumericImpact(modules.A1A3, "gwp")) {
    warnings.push(
      "Dataset is unit-compatible but does not provide a supported A1-A3 GWP value. No A1-A3 value was invented."
    );
  }

  if (availableGwpModules.length === 0) {
    warnings.push(
      "No supported A-C GWP values are available from this dataset for the selected quantity."
    );
  } else {
    // A-C is an available-module sum. Explicitly warn when the result should
    // not be interpreted as a complete lifecycle boundary.
    const missingCore = CORE_GWP_BOUNDARY.filter(
      (module) => !hasNumericImpact(modules[module], "gwp")
    );
    if (missingCore.length) {
      warnings.push(
        `A-C GWP is a sum of available modules only. Missing GWP modules: ${missingCore.join(
          ", "
        )}.`
      );
    }
  }

  const aToC = sumModules(modules, A_TO_C_MODULES);
  const moduleD = modules.D || emptyImpact();
  const aToCPlusD = addImpact(aToC, moduleD);
  const carbonPerDollar =
    cost > 0 && typeof aToC.gwp === "number" ? aToC.gwp / cost : null;

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

  const lines = rows.map((row) =>
    calculateLine(
      row,
      row.epdId ? epdById.get(row.epdId) : undefined,
      buildingLife
    )
  );

  const moduleTotals: Partial<Record<LcaModule, ImpactSet>> = {};
  MODULE_ORDER.forEach((module) => {
    const total = addImpact(...lines.map((line) => line.modules[module]));
    if (Object.keys(total).length) moduleTotals[module] = total;
  });

  // Operational energy is a project-level B6 scenario, not multiplied across
  // material rows. A zero annual-energy input intentionally leaves B6 absent.
  if (
    annualEnergyKwh > 0 &&
    buildingLife > 0 &&
    Number.isFinite(gridIntensity) &&
    gridIntensity >= 0
  ) {
    const operationalGwp = annualEnergyKwh * buildingLife * gridIntensity;
    moduleTotals.B6 = addImpact(moduleTotals.B6, { gwp: operationalGwp });
  }

  const aToC = sumModules(moduleTotals, A_TO_C_MODULES);
  const moduleD = moduleTotals.D || {};
  const aToCPlusD = addImpact(aToC, moduleD);
  const totalCost = lines.reduce((sum, line) => sum + line.cost, 0);
  const warnings = lines.flatMap((line) =>
    line.warnings.map((warning) => `${line.row.materialName}: ${warning}`)
  );

  // Keep these concepts separate. A row can have an EPD match but still be
  // non-calculable because of incompatible units, and it can be calculable
  // while the selected dataset still has no supported GWP.
  const epdMatchedRows = lines.filter((line) => !!line.epd).length;
  const calculableRows = lines.filter(
    (line) => !!line.epd && line.declaredQuantity !== null
  ).length;
  const rowsWithGwp = lines.filter(
    (line) =>
      !!line.epd &&
      line.declaredQuantity !== null &&
      typeof line.aToC.gwp === "number" &&
      Number.isFinite(line.aToC.gwp)
  ).length;

  const rowsWithCompleteCoreGwp = lines.filter(
    (line) =>
      !!line.epd &&
      line.declaredQuantity !== null &&
      CORE_GWP_BOUNDARY.every((module) =>
        hasNumericImpact(line.modules[module], "gwp")
      )
  ).length;

  const rowCount = lines.length;

  return {
    lines,
    moduleTotals,
    aToC,
    moduleD,
    aToCPlusD,
    totalCost,
    warnings,
    epdMatchedRows,
    calculableRows,
    rowsWithGwp,
    rowsWithCompleteCoreGwp,
    epdMatchShare: rowCount > 0 ? (epdMatchedRows / rowCount) * 100 : 0,
    calculableShare: rowCount > 0 ? (calculableRows / rowCount) * 100 : 0,
    gwpRowShare: rowCount > 0 ? (rowsWithGwp / rowCount) * 100 : 0,
    coreGwpCompleteShare:
      rowCount > 0 ? (rowsWithCompleteCoreGwp / rowCount) * 100 : 0,
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

const fmtMetricValue = (
  metric: ImpactMetric,
  value: number | null | undefined
): string => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";

  // Small impact-category values (especially ozone depletion) need more
  // precision than the default 3 decimals or the UI can visually imply a
  // different reduction than the underlying calculation.
  if (metric === "ozone") return fmt(value, 6);
  if (Math.abs(value) > 0 && Math.abs(value) < 0.01) return fmt(value, 6);
  if (Math.abs(value) < 1) return fmt(value, 4);
  return fmt(value, 3);
};

const fmtPercent = (value: number | null | undefined, digits = 2): string =>
  typeof value === "number" && Number.isFinite(value)
    ? `${fmt(value, digits)}%`
    : "N/A";

// jsPDF's built-in Helvetica font is not a full Unicode font. Keep the web UI
// rich, but sanitize PDF-only text so subscripts/comparison symbols never corrupt.
const pdfSafeText = (value: unknown): string =>
  String(value ?? "")
    .replace(/₂/g, "2")
    .replace(/₃/g, "3")
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/[—–]/g, "-")
    .replace(/×/g, "x")
    .replace(/…/g, "...")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');

const reductionPct = (baseline?: number | null, proposed?: number | null): number | null => {
  if (typeof baseline !== "number" || typeof proposed !== "number" || baseline === 0) return null;
  return ((baseline - proposed) / baseline) * 100;
};

const moduleDChangeLabel = (
  baseline?: number | null,
  proposed?: number | null
): string => {
  if (
    typeof baseline !== "number" ||
    typeof proposed !== "number" ||
    !Number.isFinite(baseline) ||
    !Number.isFinite(proposed)
  ) {
    return "N/A";
  }

  if (baseline < 0 && proposed < 0) {
    const baselineCredit = Math.abs(baseline);
    const proposedCredit = Math.abs(proposed);
    if (baselineCredit === 0) return "N/A";

    const creditChange =
      ((baselineCredit - proposedCredit) / baselineCredit) * 100;

    if (Math.abs(creditChange) < 0.000001) return "No change";
    return creditChange > 0
      ? `${fmt(Math.abs(creditChange), 2)}% less credit`
      : `${fmt(Math.abs(creditChange), 2)}% more credit`;
  }

  if ((baseline < 0 && proposed >= 0) || (baseline >= 0 && proposed < 0)) {
    return "Sign change";
  }

  return fmtPercent(reductionPct(baseline, proposed), 2);
};

const parseDistanceKm = (value: unknown, header: string | undefined): number => {
  const parsed = nOrNull(value);
  if (parsed === null || parsed <= 0) return 0;

  const key = String(header || "").toLowerCase();
  if (/(mile|miles|\bmi\b)/.test(key)) return parsed * 1.609344;
  if (/(meter|metre|_m\b|\(m\))/.test(key) && !/(km|kilometer|kilometre)/.test(key)) {
    return parsed / 1000;
  }
  return parsed;
};

const parseThicknessM = (value: unknown, header: string | undefined): number | null => {
  const parsed = nOrNull(value);
  if (parsed === null || parsed <= 0) return null;

  const key = String(header || "").toLowerCase();
  if (/(mm|millimeter|millimetre)/.test(key)) return parsed / 1000;
  if (/(cm|centimeter|centimetre)/.test(key)) return parsed / 100;
  if (/(inch|inches|_in\b|\(in\))/.test(key)) return parsed * 0.0254;
  if (/(ft|feet|foot)/.test(key)) return parsed * 0.3048;

  // Generic "Thickness" remains interpreted as metres because BomRow stores
  // thicknessM. Prefer explicit Thickness_m / Thickness_mm headers in imports.
  return parsed;
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
            Free embodied carbon & whole-building LCA calculator · No signup required
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black mt-6 tracking-tight break-words">
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

      <section className="max-w-[1500px] mx-auto px-0 sm:px-6 py-6 sm:py-12 min-w-0">
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
  const [baselineSourceName, setBaselineSourceName] = useState("");
  const [proposedSourceName, setProposedSourceName] = useState("");

  const [projectName, setProjectName] = useState("Untitled LCA Project");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectToken, setProjectToken] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<SavedProjectRef[]>([]);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [isProjectBusy, setIsProjectBusy] = useState(false);
  const [projectStatus, setProjectStatus] = useState("");

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
    const availableIds = new Set(epds.map((epd) => epd.id));

    epds.forEach((epd) => {
      [epd.name, ...epd.aliases].forEach((alias) =>
        map.set(normalizeName(alias), epd.id)
      );
    });

    // Ignore stale alias mappings whose referenced EPD is not actually
    // available in the current session/database. Otherwise the CSV row looks
    // "resolved" and skips reconciliation even though calculation receives no EPD.
    materialMappings.forEach((mapping) => {
      if (availableIds.has(mapping.epdId)) {
        map.set(mapping.normalizedAlias, mapping.epdId);
      }
    });

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
      safeLocalStorageSet("lca_v2_epd_cache", JSON.stringify(epdArray));
      safeLocalStorageSet("lca_v2_alias_cache", JSON.stringify(mappingArray));
      setIsLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROJECT_INDEX_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const clean = parsed
        .filter(
          (item: any) =>
            item &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            typeof item.editToken === "string"
        )
        .slice(0, 100);

      setSavedProjects(clean);
    } catch (error) {
      console.warn("Saved project index could not be read.", error);
    }
  }, []);

  const resolveEpdId = (materialName: string): string | undefined => aliasToEpdId.get(normalizeName(materialName));

  const parseCsvRows = (
    data: Record<string, unknown>[],
    mapping: typeof columnMapping
  ): BomRow[] => {
    return data
      .map((raw, index) => {
        const materialName = String(raw[mapping.material] ?? "").trim();
        const quantity = n(raw[mapping.quantity], 0);
        const unit = String(raw[mapping.unit] ?? "unit").trim() || "unit";

        const keys = Object.keys(raw);
        const distanceKey = keys.find((key) =>
          /distance|transport.*(km|mile|mi|meter|metre)|\bkm\b/i.test(key)
        );
        const modeKey = keys.find((key) => /mode|transport.*type/i.test(key));
        const thicknessKey = keys.find((key) => /thickness/i.test(key));
        const costKey = keys.find((key) =>
          /unit.*cost|cost.*unit|price/i.test(key)
        );

        const rawMode = modeKey
          ? String(raw[modeKey] ?? "").trim().toLowerCase()
          : "";
        const recognizedTransportMode =
          rawMode.includes("rail") ||
          rawMode.includes("ship") ||
          rawMode.includes("truck") ||
          rawMode.includes("road");
        const mode: TransportMode = rawMode.includes("rail")
          ? "rail"
          : rawMode.includes("ship")
          ? "ship"
          : "truck";

        return {
          id: `${Date.now()}-${index}-${slugId(materialName)}`,
          materialName: materialName || `Unnamed Material ${index + 1}`,
          epdId: materialName ? resolveEpdId(materialName) : undefined,
          quantity,
          unit,
          // Never invent a default haul distance. No distance column => 0 km,
          // leaving any EPD A4 value untouched.
          distanceKm: distanceKey
            ? parseDistanceKm(raw[distanceKey], distanceKey)
            : 0,
          mode,
          transportModeWasDefaulted: !recognizedTransportMode,
          thicknessM: thicknessKey
            ? parseThicknessM(raw[thicknessKey], thicknessKey)
            : null,
          costPerInputUnit: costKey ? n(raw[costKey], 0) : 0,
        } satisfies BomRow;
      })
      .filter(
        (row) =>
          row.materialName &&
          Number.isFinite(row.quantity) &&
          row.quantity > 0
      );
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
        setPendingUpload({
          type,
          data: results.data,
          headers,
          sourceFileName: file.name,
        });
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
      setPendingReconciliation({
        type: pendingUpload.type,
        rows,
        unknownAliases,
        sourceFileName: pendingUpload.sourceFileName,
      });
    } else {
      commitRows(pendingUpload.type, rows, pendingUpload.sourceFileName);
    }
    setPendingUpload(null);
  };

  const commitRows = (
    type: ModelType,
    rows: BomRow[],
    sourceFileName = ""
  ) => {
    if (type === "baseline") {
      setBaselineRows(rows);
      if (sourceFileName) setBaselineSourceName(sourceFileName);
      setActiveView(proposedRows.length ? "comparison" : "baseline");
    } else {
      setProposedRows(rows);
      if (sourceFileName) setProposedSourceName(sourceFileName);
      setActiveView(baselineRows.length ? "comparison" : "proposed");
    }
    setProjectStatus("");
    setPage(0);
  };

  const rememberProjectRef = (ref: SavedProjectRef) => {
    setSavedProjects((prev) => {
      const next = [
        ref,
        ...prev.filter((item) => item.id !== ref.id),
      ].slice(0, 100);
      safeLocalStorageSet(PROJECT_INDEX_KEY, JSON.stringify(next));
      return next;
    });
  };

  const buildProjectPayload = () => {
    const ec3SessionOnlyRows = [...baselineRows, ...proposedRows].filter(
      (row) => {
        const epd = row.epdId ? epdById.get(row.epdId) : undefined;
        return epd?.source === "EC3" && !EC3_PERSISTENCE_ALLOWED;
      }
    ).length;

    return {
      name: projectName.trim() || "Untitled LCA Project",
      studyPeriodYears: buildingLife,
      floorAreaM2,
      annualEnergyKwh,
      gridIntensity,
      baselineRows,
      proposedRows,
      metadata: {
        baselineSourceName: baselineSourceName || null,
        proposedSourceName: proposedSourceName || null,
        baselineFingerprint: baselineRows.length
          ? modelFingerprint(baselineRows)
          : null,
        proposedFingerprint: proposedRows.length
          ? modelFingerprint(proposedRows)
          : null,
        ec3SessionOnlyRows,
      },
    };
  };

  const saveProject = async () => {
    if (!baselineRows.length && !proposedRows.length) {
      alert("Upload a baseline or proposed model before saving a project.");
      return;
    }

    setIsProjectBusy(true);
    setProjectStatus("Saving project...");

    try {
      const payload = buildProjectPayload();
      const isExisting = Boolean(projectId && projectToken);
      const url = isExisting
        ? `/api/lca/projects/${encodeURIComponent(projectId!)}`
        : "/api/lca/projects";

      const response = await fetch(url, {
        method: isExisting ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(isExisting
            ? { "X-LCA-Project-Token": projectToken! }
            : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.success) {
        throw new Error(
          json?.error || `Project save failed with HTTP ${response.status}.`
        );
      }

      const nextId = String(json.project?.id || projectId || "");
      const nextToken = String(json.editToken || projectToken || "");

      if (!nextId || !nextToken) {
        throw new Error("The project was saved but its local project key is missing.");
      }

      setProjectId(nextId);
      setProjectToken(nextToken);

      const ref: SavedProjectRef = {
        id: nextId,
        name: String(json.project?.name || payload.name),
        editToken: nextToken,
        updatedAt: String(
          json.project?.updatedAt ||
            json.project?.updated_at ||
            new Date().toISOString()
        ),
      };

      rememberProjectRef(ref);

      const sessionOnlyCount = Number(payload.metadata.ec3SessionOnlyRows || 0);
      setProjectStatus(
        sessionOnlyCount > 0
          ? `Saved. ${sessionOnlyCount} row(s) use EC3 data that is session-only under your current persistence setting; those EPDs may need reconciliation after a fresh browser session.`
          : "Project saved to Neon."
      );
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Project could not be saved.";
      setProjectStatus(message);
      alert(message);
    } finally {
      setIsProjectBusy(false);
    }
  };

  const loadProject = async (ref: SavedProjectRef) => {
    setIsProjectBusy(true);
    setProjectStatus("Loading project...");

    try {
      const response = await fetch(
        `/api/lca/projects/${encodeURIComponent(ref.id)}`,
        {
          headers: {
            "X-LCA-Project-Token": ref.editToken,
          },
          cache: "no-store",
        }
      );

      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.success || !json?.project) {
        throw new Error(
          json?.error || `Project load failed with HTTP ${response.status}.`
        );
      }

      const project = json.project as SavedProjectPayload;
      const baseline = Array.isArray(project.baselineRows)
        ? project.baselineRows
        : [];
      const proposed = Array.isArray(project.proposedRows)
        ? project.proposedRows
        : [];

      setProjectId(project.id);
      setProjectToken(ref.editToken);
      setProjectName(project.name || "Untitled LCA Project");
      setBuildingLife(Math.max(0, n(project.studyPeriodYears, 60)));
      setFloorAreaM2(Math.max(0, n(project.floorAreaM2, 0)));
      setAnnualEnergyKwh(Math.max(0, n(project.annualEnergyKwh, 0)));
      setGridIntensity(Math.max(0, n(project.gridIntensity, 0)));
      setBaselineRows(baseline);
      setProposedRows(proposed);
      setBaselineSourceName(project.metadata?.baselineSourceName || "");
      setProposedSourceName(project.metadata?.proposedSourceName || "");
      setActiveView(
        baseline.length && proposed.length
          ? "comparison"
          : proposed.length
          ? "proposed"
          : "baseline"
      );
      setTab("overview");
      setPage(0);
      setShowProjectManager(false);

      rememberProjectRef({
        ...ref,
        name: project.name || ref.name,
        updatedAt: project.updatedAt || ref.updatedAt,
      });

      const missingEpdRefs = [...baseline, ...proposed].filter(
        (row) => row.epdId && !epdById.has(row.epdId)
      ).length;

      setProjectStatus(
        missingEpdRefs > 0
          ? `Project loaded. ${missingEpdRefs} saved row(s) reference EPDs not available in this session/database; review their mapping before formal reporting.`
          : "Project loaded."
      );
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Project could not be loaded.";
      setProjectStatus(message);
      alert(message);
    } finally {
      setIsProjectBusy(false);
    }
  };

  const deleteProject = async (ref: SavedProjectRef) => {
    if (
      !window.confirm(
        `Delete "${ref.name}" from the server and this browser's saved-project list?`
      )
    ) {
      return;
    }

    setIsProjectBusy(true);

    try {
      const response = await fetch(
        `/api/lca/projects/${encodeURIComponent(ref.id)}`,
        {
          method: "DELETE",
          headers: {
            "X-LCA-Project-Token": ref.editToken,
          },
        }
      );

      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.success) {
        throw new Error(
          json?.error || `Project delete failed with HTTP ${response.status}.`
        );
      }

      setSavedProjects((prev) => {
        const next = prev.filter((item) => item.id !== ref.id);
        safeLocalStorageSet(PROJECT_INDEX_KEY, JSON.stringify(next));
        return next;
      });

      if (projectId === ref.id) {
        setProjectId(null);
        setProjectToken(null);
        setProjectStatus("Saved project deleted. Current model remains open.");
      }
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "Project could not be deleted."
      );
    } finally {
      setIsProjectBusy(false);
    }
  };

  const startNewProject = () => {
    if (
      (baselineRows.length || proposedRows.length) &&
      !window.confirm(
        "Start a new project? The current in-memory model will be cleared. Save it first if you want to keep it."
      )
    ) {
      return;
    }

    setProjectId(null);
    setProjectToken(null);
    setProjectName("Untitled LCA Project");
    setBaselineRows([]);
    setProposedRows([]);
    setBaselineSourceName("");
    setProposedSourceName("");
    setBuildingLife(60);
    setFloorAreaM2(10000);
    setAnnualEnergyKwh(0);
    setGridIntensity(0.38);
    setActiveView("proposed");
    setTab("overview");
    setPage(0);
    setProjectStatus("New unsaved project.");
  };

  const anonymousWorkspaceSnapshot = useMemo(
    () => ({
      workspaceVersion: "Workspace-V2.7",
      appVersion: LCA_APP_VERSION,
      calculationEngineVersion: LCA_CALC_ENGINE_VERSION,
      projectName,
      projectId,
      projectToken,
      buildingLife,
      floorAreaM2,
      annualEnergyKwh,
      gridIntensity,
      baselineRows,
      proposedRows,
      baselineSourceName,
      proposedSourceName,
      activeView,
      tab,
      savedAt: new Date().toISOString(),
    }),
    [
      projectName,
      projectId,
      projectToken,
      buildingLife,
      floorAreaM2,
      annualEnergyKwh,
      gridIntensity,
      baselineRows,
      proposedRows,
      baselineSourceName,
      proposedSourceName,
      activeView,
      tab,
    ]
  );

  const restoreAnonymousWorkspace = (raw: any) => {
    if (!raw || typeof raw !== "object") {
      setProjectStatus("Anonymous workspace backup is invalid.");
      return;
    }

    const baseline = Array.isArray(raw.baselineRows) ? raw.baselineRows : [];
    const proposed = Array.isArray(raw.proposedRows) ? raw.proposedRows : [];

    setProjectName(
      typeof raw.projectName === "string" && raw.projectName.trim()
        ? raw.projectName.slice(0, 160)
        : "Untitled LCA Project"
    );
    setBuildingLife(Math.max(0, n(raw.buildingLife, 60)));
    setFloorAreaM2(Math.max(0, n(raw.floorAreaM2, 10000)));
    setAnnualEnergyKwh(Math.max(0, n(raw.annualEnergyKwh, 0)));
    setGridIntensity(Math.max(0, n(raw.gridIntensity, 0.38)));
    setBaselineRows(baseline);
    setProposedRows(proposed);
    setBaselineSourceName(
      typeof raw.baselineSourceName === "string" ? raw.baselineSourceName : ""
    );
    setProposedSourceName(
      typeof raw.proposedSourceName === "string" ? raw.proposedSourceName : ""
    );

    const restoredView: ActiveView = ["baseline", "proposed", "comparison"].includes(
      raw.activeView
    )
      ? raw.activeView
      : baseline.length && proposed.length
      ? "comparison"
      : proposed.length
      ? "proposed"
      : "baseline";
    const restoredTab: DashboardTab = [
      "overview",
      "materials",
      "use",
      "procurement",
      "quality",
    ].includes(raw.tab)
      ? raw.tab
      : "overview";

    setActiveView(restoredView);
    setTab(restoredTab);
    setPage(0);

    const restoredId = typeof raw.projectId === "string" ? raw.projectId : "";
    const restoredToken =
      typeof raw.projectToken === "string" ? raw.projectToken : "";

    if (restoredId && restoredToken) {
      setProjectId(restoredId);
      setProjectToken(restoredToken);
      rememberProjectRef({
        id: restoredId,
        name:
          typeof raw.projectName === "string" && raw.projectName.trim()
            ? raw.projectName
            : "Imported LCA project",
        editToken: restoredToken,
        updatedAt: new Date().toISOString(),
      });
    } else {
      setProjectId(null);
      setProjectToken(null);
    }

    const missingEpdRefs = [...baseline, ...proposed].filter(
      (row: BomRow) => row?.epdId && !epdById.has(row.epdId)
    ).length;

    setProjectStatus(
      missingEpdRefs > 0
        ? `Anonymous workspace restored. ${missingEpdRefs} row(s) reference EPDs not currently available; review mapping before formal reporting.`
        : "Anonymous workspace restored."
    );
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
        safeLocalStorageSet("lca_v2_epd_cache", JSON.stringify(next));
      }
      return next;
    });

    setMaterialMappings((prev) => {
      const map = new Map(prev.map((item) => [item.normalizedAlias, item]));
      map.set(mapping.normalizedAlias, mapping);
      const next = Array.from(map.values());

      if (epd.source !== "EC3" || EC3_PERSISTENCE_ALLOWED) {
        safeLocalStorageSet("lca_v2_alias_cache", JSON.stringify(next));
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

      // Enrich every selected EC3 result when an ID is available. EC3/openEPD
      // identifiers are not guaranteed to start with "ec3"; UUID-style IDs
      // must not be skipped or the calculation can lose full module data.
      if (selectedId) {
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

    commitRows(
      pendingReconciliation.type,
      resolvedRows,
      pendingReconciliation.sourceFileName
    );
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

    const componentMasses = valid.map((item) => {
      const component = epdById.get(item.epdId);
      return component?.massKgPerDeclaredUnit &&
        component.massKgPerDeclaredUnit > 0
        ? component.massKgPerDeclaredUnit * item.qtyDeclared
        : null;
    });
    const massKg = componentMasses.every(
      (value): value is number => typeof value === "number"
    )
      ? componentMasses.reduce((sum, value) => sum + value, 0)
      : null;

    const componentRsls = valid.map(
      (item) => epdById.get(item.epdId)?.referenceServiceLifeYears ?? null
    );
    const referenceServiceLifeYears = componentRsls.every(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value) && value > 0
    )
      ? Math.min(...componentRsls)
      : null;

    const assemblyBasis = normalizeDeclaredBasis(assemblyUnit, 1);

    const epd: EpdRecord = {
      id: `assembly-${slugId(assemblyName)}-${Date.now()}`,
      name: assemblyName.trim(),
      aliases: [assemblyName.trim()],
      category: assemblyCategory,
      source: "Custom",
      declaredUnit: assemblyBasis.declaredUnit,
      declaredQuantity: assemblyBasis.declaredQuantity,
      declaredUnitWasMissing: assemblyBasis.declaredUnitWasMissing,
      massKgPerDeclaredUnit: massKg,
      referenceServiceLifeYears,
      modules,
      metadata: {
        components: valid,
        massComplete: massKg !== null,
        rslComplete: referenceServiceLifeYears !== null,
      },
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
  const currentReport =
    activeView === "baseline"
      ? baselineReport
      : activeView === "proposed"
      ? proposedReport || baselineReport
      : null;

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
    if (!comparisonMetrics.length || !baselineReport || !proposedReport) {
      return null;
    }

    const rowCoverageComplete =
      baselineReport.epdMatchedRows === baselineReport.lines.length &&
      proposedReport.epdMatchedRows === proposedReport.lines.length &&
      baselineReport.calculableRows === baselineReport.lines.length &&
      proposedReport.calculableRows === proposedReport.lines.length;

    if (!rowCoverageComplete) {
      return {
        complete: false,
        passes: false,
        reason:
          "Indicative LEED-style assessment unavailable: unmapped or unit-incompatible rows remain in one or both models.",
      };
    }

    const gwpCoverageComplete =
      baselineReport.rowsWithGwp === baselineReport.lines.length &&
      proposedReport.rowsWithGwp === proposedReport.lines.length;

    if (!gwpCoverageComplete) {
      return {
        complete: false,
        passes: false,
        reason: `Indicative LEED-style assessment unavailable: usable A-C GWP exists for only ${baselineReport.rowsWithGwp}/${baselineReport.lines.length} baseline rows and ${proposedReport.rowsWithGwp}/${proposedReport.lines.length} proposed rows. Complete material-level GWP coverage is required before reduction criteria are evaluated.`,
      };
    }

    const coreBoundaryComplete =
      baselineReport.rowsWithCompleteCoreGwp === baselineReport.lines.length &&
      proposedReport.rowsWithCompleteCoreGwp === proposedReport.lines.length;

    if (!coreBoundaryComplete) {
      return {
        complete: false,
        passes: false,
        reason: `Indicative LEED-style assessment unavailable: every material has at least one usable A-C GWP value, but the configured core GWP boundary (${CORE_GWP_BOUNDARY.join(", ")}) is complete for only ${baselineReport.rowsWithCompleteCoreGwp}/${baselineReport.lines.length} baseline rows and ${proposedReport.rowsWithCompleteCoreGwp}/${proposedReport.lines.length} proposed rows. The available-scope comparison remains usable for decision support, but formal reduction logic is held back until the configured core boundary is complete.`,
      };
    }

    const completeMetrics = comparisonMetrics.every(
      (metric) => typeof metric.reduction === "number"
    );
    if (!completeMetrics) {
      return {
        complete: false,
        passes: false,
        reason:
          "Indicative LEED-style assessment unavailable: one or more required impact categories are missing from the comparison dataset.",
      };
    }

    const reductions = comparisonMetrics.map(
      (metric) => metric.reduction as number
    );
    const gwpPassed = reductions[0] >= 10;
    const passed10 = reductions.filter((value) => value >= 10).length;
    const failed5 = reductions.some((value) => value < -5);

    return {
      complete: true,
      passes: gwpPassed && passed10 >= 3 && !failed5,
      reason: `Available-data logic check — GWP ≥10%: ${
        gwpPassed ? "yes" : "no"
      }; categories ≥10%: ${passed10}; no category worse than 5%: ${
        !failed5 ? "yes" : "no"
      }. Formal LEED documentation still requires project-specific scope and independent validation.`,
    };
  }, [comparisonMetrics, baselineReport, proposedReport]);

  const phaseChartData = useMemo(() => {
    const sumKnownStage = (
      report: ProjectReport,
      modules: LcaModule[]
    ): number | null => {
      const values = modules
        .map((module) => report.moduleTotals[module]?.gwp)
        .filter(
          (value): value is number =>
            typeof value === "number" && Number.isFinite(value)
        );
      return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
    };

    const toRow = (name: string, report: ProjectReport) => ({
      name,
      "A1-A3": report.moduleTotals.A1A3?.gwp ?? null,
      A4: report.moduleTotals.A4?.gwp ?? null,
      A5: report.moduleTotals.A5?.gwp ?? null,
      "B1-B7": sumKnownStage(report, [
        "B1",
        "B2",
        "B3",
        "B4",
        "B5",
        "B6",
        "B7",
      ]),
      "C1-C4": sumKnownStage(report, ["C1", "C2", "C3", "C4"]),
    });

    const data: any[] = [];
    if (baselineReport) data.push(toRow("Baseline", baselineReport));
    if (proposedReport) data.push(toRow("Proposed", proposedReport));
    return data;
  }, [baselineReport, proposedReport]);

  const crossoverData = useMemo(() => {
    if (!currentReport) return [];

    const initialStageValues = [
      currentReport.moduleTotals.A1A3?.gwp,
      currentReport.moduleTotals.A4?.gwp,
      currentReport.moduleTotals.A5?.gwp,
    ].filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value)
    );

    // Do not render "0 embodied carbon" when the underlying EPD impacts are
    // simply unavailable.
    if (!initialStageValues.length) return [];

    const embodied = initialStageValues.reduce(
      (sum, value) => sum + value,
      0
    );

    const data = [];
    for (
      let year = 0;
      year <= buildingLife;
      year += Math.max(1, Math.round(buildingLife / 12))
    ) {
      const operational = year * annualEnergyKwh * gridIntensity;
      data.push({
        year: `Year ${year}`,
        Embodied: embodied,
        Operational: operational,
        Total: embodied + operational,
      });
    }
    return data;
  }, [currentReport, buildingLife, annualEnergyKwh, gridIntensity]);

  const updateRow = (index: number, patch: Partial<BomRow>) => {
    const setter = activeView === "baseline" ? setBaselineRows : setProposedRows;
    setter((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const exportComparisonCsv = () => {
    if (!baselineReport || !proposedReport) return;

    const rows: Array<Record<string, string | number>> = [];
    const baselineIntensity =
      floorAreaM2 > 0 && typeof baselineReport.aToC.gwp === "number"
        ? baselineReport.aToC.gwp / floorAreaM2
        : null;
    const proposedIntensity =
      floorAreaM2 > 0 && typeof proposedReport.aToC.gwp === "number"
        ? proposedReport.aToC.gwp / floorAreaM2
        : null;

    const pushRow = (
      section: string,
      metric: string,
      unit: string,
      baseline: string | number,
      proposed: string | number,
      reduction: string | number,
      notes = ""
    ) => {
      rows.push({
        Section: section,
        Metric: metric,
        Unit: unit,
        Baseline: baseline,
        Proposed: proposed,
        "Reduction (%)": reduction,
        Notes: notes,
      });
    };

    pushRow(
      "Summary",
      "A-C GWP (available modules)",
      "kg CO2e",
      baselineReport.aToC.gwp ?? "",
      proposedReport.aToC.gwp ?? "",
      reductionPct(baselineReport.aToC.gwp, proposedReport.aToC.gwp) ?? "",
      "Module D excluded; missing lifecycle modules remain unavailable."
    );
    pushRow(
      "Summary",
      "A-C GWP intensity (available modules)",
      "kg CO2e/m2",
      baselineIntensity ?? "",
      proposedIntensity ?? "",
      reductionPct(baselineIntensity, proposedIntensity) ?? ""
    );
    pushRow(
      "Summary",
      "Project cost",
      "USD",
      baselineReport.totalCost,
      proposedReport.totalCost,
      reductionPct(baselineReport.totalCost, proposedReport.totalCost) ?? ""
    );

    comparisonMetrics.forEach((item) => {
      pushRow(
        "Impact category",
        item.label,
        item.unit,
        item.baseline ?? "",
        item.proposed ?? "",
        item.reduction ?? ""
      );
    });

    MODULE_ORDER.forEach((module) => {
      const baselineValue = baselineReport.moduleTotals[module]?.gwp ?? null;
      const proposedValue = proposedReport.moduleTotals[module]?.gwp ?? null;
      pushRow(
        "Lifecycle module GWP",
        module,
        "kg CO2e",
        baselineValue ?? "",
        proposedValue ?? "",
        module === "D"
          ? moduleDChangeLabel(baselineValue, proposedValue)
          : reductionPct(baselineValue, proposedValue) ?? "",
        module === "D"
          ? "Module D reported separately from A-C; negative values are potential beyond-system-boundary credits/benefits."
          : ""
      );
    });

    pushRow(
      "Data quality",
      "EPD matched rows",
      "rows",
      `${baselineReport.epdMatchedRows}/${baselineReport.lines.length}`,
      `${proposedReport.epdMatchedRows}/${proposedReport.lines.length}`,
      ""
    );
    pushRow(
      "Data quality",
      "Unit-compatible rows",
      "rows",
      `${baselineReport.calculableRows}/${baselineReport.lines.length}`,
      `${proposedReport.calculableRows}/${proposedReport.lines.length}`,
      ""
    );
    pushRow(
      "Data quality",
      "Rows with at least one A-C GWP value",
      "rows",
      `${baselineReport.rowsWithGwp}/${baselineReport.lines.length}`,
      `${proposedReport.rowsWithGwp}/${proposedReport.lines.length}`,
      ""
    );
    pushRow(
      "Data quality",
      "Rows complete for configured core GWP boundary",
      "rows",
      `${baselineReport.rowsWithCompleteCoreGwp}/${baselineReport.lines.length}`,
      `${proposedReport.rowsWithCompleteCoreGwp}/${proposedReport.lines.length}`,
      ""
    );
    pushRow(
      "Data quality",
      "Warnings",
      "count",
      baselineReport.warnings.length,
      proposedReport.warnings.length,
      "",
      leedIndicative?.reason || ""
    );

    const blob = new Blob(["\uFEFF", Papa.unparse(rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LCA_V2_Comparison_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportComparisonPdf = () => {
    if (!baselineReport || !proposedReport) return;
    setIsDownloading(true);

    try {
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 34, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("LCA ENGINE V2 COMPARISON REPORT", 14, 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        "Baseline vs proposed - available lifecycle modules; Module D reported separately",
        14,
        25
      );

      const baselineIntensity =
        floorAreaM2 > 0 && typeof baselineReport.aToC.gwp === "number"
          ? baselineReport.aToC.gwp / floorAreaM2
          : null;
      const proposedIntensity =
        floorAreaM2 > 0 && typeof proposedReport.aToC.gwp === "number"
          ? proposedReport.aToC.gwp / floorAreaM2
          : null;
      const gwpReduction = reductionPct(
        baselineReport.aToC.gwp,
        proposedReport.aToC.gwp
      );

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Comparison Summary", 14, 46);

      autoTable(doc, {
        startY: 52,
        head: [["Metric", "Baseline", "Proposed", "Reduction"]],
        body: [
          [
            "A-C GWP (available modules)",
            `${fmt(baselineReport.aToC.gwp, 2)} kg CO2e`,
            `${fmt(proposedReport.aToC.gwp, 2)} kg CO2e`,
            fmtPercent(gwpReduction, 2),
          ],
          [
            "A-C GWP intensity (available modules)",
            `${fmt(baselineIntensity, 3)} kg CO2e/m2`,
            `${fmt(proposedIntensity, 3)} kg CO2e/m2`,
            fmtPercent(reductionPct(baselineIntensity, proposedIntensity), 2),
          ],
          [
            "Project cost",
            `$${fmt(baselineReport.totalCost, 2)}`,
            `$${fmt(proposedReport.totalCost, 2)}`,
            fmtPercent(
              reductionPct(
                baselineReport.totalCost,
                proposedReport.totalCost
              ),
              2
            ),
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42] },
      });

      const firstTableEnd = (doc as any).lastAutoTable?.finalY ?? 86;

      autoTable(doc, {
        startY: firstTableEnd + 8,
        head: [[
          "Impact category (available modules)",
          "Baseline",
          "Proposed",
          "Reduction",
        ]],
        body: comparisonMetrics.map((item) => [
          item.label,
          pdfSafeText(`${fmtMetricValue(item.metric, item.baseline)} ${item.unit}`),
          pdfSafeText(`${fmtMetricValue(item.metric, item.proposed)} ${item.unit}`),
          fmtPercent(item.reduction, 2),
        ]),
        theme: "grid",
        headStyles: { fillColor: [30, 64, 175] },
      });

      doc.addPage("a4", "landscape");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Lifecycle Module GWP", 14, 18);
      autoTable(doc, {
        startY: 24,
        head: [["Module", "Baseline kg CO2e", "Proposed kg CO2e", "Reduction"]],
        body: MODULE_ORDER.map((module) => {
          const baselineValue = baselineReport.moduleTotals[module]?.gwp ?? null;
          const proposedValue = proposedReport.moduleTotals[module]?.gwp ?? null;
          return [
            module,
            fmt(baselineValue, 3),
            fmt(proposedValue, 3),
            module === "D"
              ? moduleDChangeLabel(baselineValue, proposedValue)
              : fmtPercent(reductionPct(baselineValue, proposedValue), 2),
          ];
        }),
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42] },
      });

      const moduleEnd = (doc as any).lastAutoTable?.finalY ?? 112;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Data Quality", 14, moduleEnd + 10);
      autoTable(doc, {
        startY: moduleEnd + 15,
        head: [["Check", "Baseline", "Proposed"]],
        body: [
          [
            "EPD matched rows",
            `${baselineReport.epdMatchedRows}/${baselineReport.lines.length}`,
            `${proposedReport.epdMatchedRows}/${proposedReport.lines.length}`,
          ],
          [
            "Unit-compatible rows",
            `${baselineReport.calculableRows}/${baselineReport.lines.length}`,
            `${proposedReport.calculableRows}/${proposedReport.lines.length}`,
          ],
          [
            "Rows with at least one A-C GWP value",
            `${baselineReport.rowsWithGwp}/${baselineReport.lines.length}`,
            `${proposedReport.rowsWithGwp}/${proposedReport.lines.length}`,
          ],
          [
            "Rows complete for configured core GWP boundary",
            `${baselineReport.rowsWithCompleteCoreGwp}/${baselineReport.lines.length}`,
            `${proposedReport.rowsWithCompleteCoreGwp}/${proposedReport.lines.length}`,
          ],
          [
            "Any-GWP row coverage",
            `${fmt(baselineReport.gwpRowShare, 1)}%`,
            `${fmt(proposedReport.gwpRowShare, 1)}%`,
          ],
          [
            "Core-boundary completeness",
            `${fmt(baselineReport.coreGwpCompleteShare, 1)}%`,
            `${fmt(proposedReport.coreGwpCompleteShare, 1)}%`,
          ],
          [
            "Warnings",
            String(baselineReport.warnings.length),
            String(proposedReport.warnings.length),
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42] },
      });

      const qualityEnd = (doc as any).lastAutoTable?.finalY ?? 170;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const methodologyText =
        "Methodology note: Comparison totals use the same available-module calculation engine as the individual models. Missing lifecycle modules remain unavailable rather than being treated as zero. Material warnings identify gaps in the configured core GWP boundary; other unavailable modules may still appear as N/A in the module table. Module D is reported separately and negative values represent potential beyond-system-boundary credits/benefits. This report is decision-support output, not a certification decision.";
      const methodologyLines = doc.splitTextToSize(
        pdfSafeText(methodologyText),
        pageWidth - 28
      );
      doc.text(methodologyLines, 14, qualityEnd + 10);

      if (leedIndicative?.reason) {
        const leedLines = doc.splitTextToSize(
          pdfSafeText(`Indicative LEED-style logic: ${leedIndicative.reason}`),
          pageWidth - 28
        );
        doc.text(leedLines, 14, qualityEnd + 20);
      }

      const pageCount = doc.getNumberOfPages();
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        doc.setPage(pageNumber);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Page ${pageNumber} of ${pageCount}`,
          pageWidth - 14,
          doc.internal.pageSize.getHeight() - 8,
          { align: "right" }
        );
      }

      doc.save(
        `LCA_V2_Comparison_Report_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportCsv = () => {
    if (activeView === "comparison") {
      exportComparisonCsv();
      return;
    }
    exportCsv();
  };

  const handleExportPdf = () => {
    if (activeView === "comparison") {
      exportComparisonPdf();
      return;
    }
    exportPdf();
  };

  const exportCsv = () => {
    if (!currentReport) return;

    const rows: Array<Record<string, string | number>> = currentReport.lines.map(
      (line) => ({
        "Input Material": line.row.materialName,
        "Mapped EPD": line.epd?.name || "UNMAPPED",
        Manufacturer: line.epd?.manufacturer || "",
        Source: line.epd?.source || "",
        "EPD Match Status": line.epd ? "Matched" : "Unmapped",
        "Unit Conversion Status":
          line.epd && line.declaredQuantity !== null
            ? "Compatible"
            : line.epd
            ? "Failed"
            : "Not attempted",
        "GWP Data Status":
          typeof line.aToC.gwp === "number" ? "Available" : "Unavailable",
        "Input Quantity": line.row.quantity,
        "Input Unit": line.row.unit,
        "Converted EPD Quantity": line.declaredQuantity ?? "",
        "EPD Declared Quantity": line.epd?.declaredQuantity ?? "",
        "EPD Declared Unit": line.epd?.declaredUnit || "",
        "Mass (kg)": line.massKg ?? "",
        "Replacement Count (B4)": line.replacementCount,
        "A1-A3 GWP": line.modules.A1A3?.gwp ?? "",
        "A4 GWP": line.modules.A4?.gwp ?? "",
        "A5 GWP": line.modules.A5?.gwp ?? "",
        "B4 GWP": line.modules.B4?.gwp ?? "",
        "B6 GWP": "Project-level; see total row",
        "C1-C4 GWP":
          addImpact(
            line.modules.C1,
            line.modules.C2,
            line.modules.C3,
            line.modules.C4
          ).gwp ?? "",
        "A-C GWP (available modules)": line.aToC.gwp ?? "",
        "Module D GWP": line.moduleD.gwp ?? "",
        "A-C + D GWP (available modules)": line.aToCPlusD.gwp ?? "",
        "Unit Cost": line.row.costPerInputUnit,
        "Line Cost": line.cost,
        "A-C kgCO2e/$": line.carbonPerDollar ?? "",
        Warnings: line.warnings.join(" | "),
      })
    );

    rows.push({
      "Input Material": "PROJECT TOTAL",
      "Mapped EPD": "",
      Manufacturer: "",
      Source: "",
      "EPD Match Status": `${currentReport.epdMatchedRows}/${currentReport.lines.length} rows`,
      "Unit Conversion Status": `${currentReport.calculableRows}/${currentReport.lines.length} rows calculable`,
      "GWP Data Status": `${currentReport.rowsWithGwp}/${currentReport.lines.length} rows with GWP`,
      "Input Quantity": "",
      "Input Unit": "",
      "Converted EPD Quantity": "",
      "EPD Declared Quantity": "",
      "EPD Declared Unit": "",
      "Mass (kg)": "",
      "Replacement Count (B4)": "",
      "A1-A3 GWP": currentReport.moduleTotals.A1A3?.gwp ?? "",
      "A4 GWP": currentReport.moduleTotals.A4?.gwp ?? "",
      "A5 GWP": currentReport.moduleTotals.A5?.gwp ?? "",
      "B4 GWP": currentReport.moduleTotals.B4?.gwp ?? "",
      "B6 GWP": currentReport.moduleTotals.B6?.gwp ?? "",
      "C1-C4 GWP":
        addImpact(
          currentReport.moduleTotals.C1,
          currentReport.moduleTotals.C2,
          currentReport.moduleTotals.C3,
          currentReport.moduleTotals.C4
        ).gwp ?? "",
      "A-C GWP (available modules)": currentReport.aToC.gwp ?? "",
      "Module D GWP": currentReport.moduleD.gwp ?? "",
      "A-C + D GWP (available modules)": currentReport.aToCPlusD.gwp ?? "",
      "Unit Cost": "",
      "Line Cost": currentReport.totalCost,
      "A-C kgCO2e/$":
        currentReport.totalCost > 0 &&
        typeof currentReport.aToC.gwp === "number"
          ? currentReport.aToC.gwp / currentReport.totalCost
          : "",
      Warnings: currentReport.warnings.join(" | "),
    });

    const blob = new Blob([Papa.unparse(rows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LCA_V2_${activeView}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
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
      doc.text(
        "Auditable calculation output - Module D reported separately",
        14,
        27
      );

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text("Project Summary", 14, 52);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const totalRows = currentReport.lines.length;
      const intensity =
        floorAreaM2 > 0 && typeof currentReport.aToC.gwp === "number"
          ? currentReport.aToC.gwp / floorAreaM2
          : null;

      doc.text(`Study period: ${buildingLife} years`, 14, 61);
      doc.text(`Gross floor area: ${fmt(floorAreaM2, 1)} m2`, 14, 68);
      doc.text(
        `EPD matched rows: ${currentReport.epdMatchedRows}/${totalRows} (${fmt(
          currentReport.epdMatchShare,
          1
        )}%)`,
        14,
        75
      );
      doc.text(
        `Unit-compatible rows: ${currentReport.calculableRows}/${totalRows} (${fmt(
          currentReport.calculableShare,
          1
        )}%)`,
        14,
        82
      );
      doc.text(
        `Rows with at least one A-C GWP value: ${currentReport.rowsWithGwp}/${totalRows} (${fmt(
          currentReport.gwpRowShare,
          1
        )}%)`,
        14,
        89
      );
      doc.text(
        `Rows complete for configured core GWP boundary: ${currentReport.rowsWithCompleteCoreGwp}/${totalRows} (${fmt(
          currentReport.coreGwpCompleteShare,
          1
        )}%)`,
        14,
        96
      );
      doc.text(
        `A-C GWP (available modules): ${fmt(
          currentReport.aToC.gwp,
          1
        )} kg CO2e`,
        14,
        103
      );
      doc.text(
        `A-C GWP intensity (available modules): ${fmt(
          intensity,
          2
        )} kg CO2e/m2`,
        14,
        110
      );
      doc.text(
        `Module D: ${fmt(currentReport.moduleD.gwp, 1)} kg CO2e`,
        14,
        117
      );
      doc.text(`Total cost: $${fmt(currentReport.totalCost, 2)}`, 14, 124);

      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        "A-C values are sums of available reported/modelled modules only. Missing modules remain N/A. Material warnings identify gaps in the configured core GWP boundary; other N/A modules are visible in the module table.",
        14,
        131,
        { maxWidth: 182 }
      );
      doc.setTextColor(15, 23, 42);

      autoTable(doc, {
        startY: 143,
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
        head: [
          [
            "Input material",
            "Mapped dataset",
            "Qty",
            "Unit status",
            "A-C GWP*",
            "Warnings",
          ],
        ],
        body: currentReport.lines.map((line) => [
          pdfSafeText(line.row.materialName),
          pdfSafeText(line.epd?.name || "UNMAPPED"),
          pdfSafeText(`${fmt(line.row.quantity, 3)} ${line.row.unit}`),
          line.epd
            ? line.declaredQuantity !== null
              ? "Compatible"
              : "Failed"
            : "Unmapped",
          fmt(line.aToC.gwp, 1),
          pdfSafeText(line.warnings.join("; ")),
        ]),
        styles: { fontSize: 6.7, cellPadding: 1.8 },
        headStyles: { fillColor: [15, 23, 42] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 42 },
          2: { cellWidth: 21 },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 49 },
        },
      });

      const inventoryFinalY = (doc as any).lastAutoTable?.finalY ?? 270;
      if (inventoryFinalY < 276) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(
          "* A-C GWP is an available-module sum; review warnings for missing lifecycle stages.",
          14,
          Math.min(inventoryFinalY + 6, 285)
        );
      }

      if (currentReport.warnings.length) {
        doc.addPage();
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Data Quality / Calculation Warnings", 14, 18);

        autoTable(doc, {
          startY: 26,
          head: [["#", "Warning"]],
          body: currentReport.warnings.map((warning, index) => [
            index + 1,
            pdfSafeText(warning),
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [180, 83, 9] },
          columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 172 } },
        });
      }

      doc.save(
        `LCA_V2_Report_${activeView}_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`
      );
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
    <div className="min-w-0 overflow-hidden border-y border-slate-200 bg-white shadow-2xl sm:rounded-xl sm:border">
      <input ref={baselineInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, "baseline")} />
      <input ref={proposedInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFileUpload(e, "proposed")} />

      {showProjectManager && (
        <Modal
          title="Saved LCA projects"
          onClose={() => setShowProjectManager(false)}
          maxWidth="max-w-4xl"
        >
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Project contents can be stored in Neon without an account. Access is protected by a private project key kept in this browser. There is no public global project list. Download an Anonymous Workspace JSON backup if you want recovery on another device or after clearing browser storage.
          </div>

          {savedProjects.length ? (
            <div className="mt-5 space-y-3">
              {savedProjects.map((ref) => (
                <div
                  key={ref.id}
                  className="rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="font-black text-slate-900 truncate">
                      {ref.name}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 font-mono break-all">
                      {ref.id}
                    </div>
                    {ref.updatedAt && (
                      <div className="mt-1 text-xs text-slate-500">
                        Last saved: {new Date(ref.updatedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                    <button
                      onClick={() => loadProject(ref)}
                      disabled={isProjectBusy}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold disabled:opacity-50"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteProject(ref)}
                      disabled={isProjectBusy}
                      className="px-4 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 font-bold disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center text-slate-500">
              No projects have been saved from this browser yet.
            </div>
          )}
        </Modal>
      )}

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
                      <option value="">Select EPD/product dataset...</option>
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
              <div key={index} className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_130px_40px] sm:items-center">
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
                  min={0}
                  value={item.qtyDeclared}
                  onChange={(e) => setAssemblyItems((prev) => prev.map((x, i) => i === index ? { ...x, qtyDeclared: Math.max(0, n(e.target.value, 0)) } : x))}
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

      <header className="bg-slate-950 text-white p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row gap-4 xl:items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-black text-lg">Enterprise LCA Engine V2</h2>
              <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] uppercase tracking-wider font-black text-emerald-300">
                {LCA_APP_VERSION} · Core {LCA_CALC_ENGINE_VERSION}
              </span>
            </div>

            <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center max-w-3xl">
              <input
                value={projectName}
                onChange={(e) => {
                  setProjectName(e.target.value.slice(0, 160));
                  setProjectStatus("");
                }}
                aria-label="Project name"
                className="w-full sm:max-w-md px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white font-bold outline-none focus:border-blue-400"
                placeholder="Project name"
              />
              <div className="text-[11px] text-slate-400">
                {projectId ? `Saved project · ${projectId.slice(0, 8)}…` : "Unsaved project"}
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              {epds.length.toLocaleString()} datasets · {materialMappings.length.toLocaleString()} saved alias mappings
              {baselineSourceName ? ` · Baseline: ${baselineSourceName}` : ""}
              {proposedSourceName ? ` · Proposed: ${proposedSourceName}` : ""}
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap xl:justify-end">
            <button
              onClick={saveProject}
              disabled={isProjectBusy || (!baselineRows.length && !proposedRows.length)}
              className="w-full px-3 py-2.5 bg-emerald-600 rounded-lg text-xs sm:w-auto sm:text-sm font-bold disabled:opacity-40"
            >
              {isProjectBusy ? "Working..." : projectId ? "Save Project" : "Save New Project"}
            </button>
            <button
              onClick={() => setShowProjectManager(true)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs sm:w-auto sm:text-sm font-bold"
            >
              Projects ({savedProjects.length})
            </button>
            <button
              onClick={startNewProject}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs sm:w-auto sm:text-sm font-bold"
            >
              New
            </button>
            <button onClick={() => setShowAssemblyBuilder(true)} className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs sm:w-auto sm:text-sm font-bold">+ Assembly</button>
            <button onClick={() => setShowRevitModal(true)} className="w-full px-3 py-2.5 bg-indigo-600 rounded-lg text-xs sm:w-auto sm:text-sm font-bold">BIM Sync</button>
            <button onClick={() => baselineInputRef.current?.click()} className="w-full px-3 py-2.5 bg-slate-700 rounded-lg text-xs sm:w-auto sm:text-sm font-bold">{baselineRows.length ? "Replace Baseline" : "Upload Baseline"}</button>
            <button onClick={() => proposedInputRef.current?.click()} className="w-full px-3 py-2.5 bg-blue-600 rounded-lg text-xs sm:w-auto sm:text-sm font-bold">{proposedRows.length ? "Replace Proposed" : "Upload Proposed"}</button>
          </div>
        </div>

        {projectStatus && (
          <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
            {projectStatus}
          </div>
        )}

        {baselineRows.length > 0 &&
          proposedRows.length > 0 &&
          modelFingerprint(baselineRows) === modelFingerprint(proposedRows) && (
            <div className="rounded-lg border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-200">
              Baseline and Proposed currently have identical normalized model fingerprints. Check that two different models were loaded before interpreting comparison reductions.
            </div>
          )}
      </header>

      <div className="border-b border-slate-200 bg-white p-3 sm:p-4">
        <AnonymousWorkspacePanel
          toolId="lca"
          toolLabel="LCA"
          toolVersion={`${LCA_APP_VERSION} · Core ${LCA_CALC_ENGINE_VERSION} · Workspace-V2.7`}
          snapshot={anonymousWorkspaceSnapshot}
          onRestore={restoreAnonymousWorkspace}
          defaultSaveName={projectName}
          privateBackup
          skipAutoRestoreWhenQuery={false}
        />
      </div>

      {isProcessing && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 text-sm font-bold text-blue-800">Processing model...</div>
      )}

      {!baselineRows.length && !proposedRows.length ? (
        <div className="min-h-[480px] flex items-center justify-center p-4 sm:min-h-[560px] sm:p-6">
          <div className="max-w-4xl w-full text-center">
            <h3 className="text-2xl font-black text-slate-900 sm:text-3xl">Start an auditable LCA</h3>
            <p className="mt-3 text-slate-500">Upload a model, map quantities to declared units, then resolve unmapped products with selected EPD/product datasets.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 mt-8 sm:mt-10">
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
              <button
                onClick={handleExportCsv}
                disabled={activeView === "comparison" ? !isComparing : !currentReport}
                title={
                  activeView === "comparison"
                    ? "Export baseline-versus-proposed comparison CSV."
                    : "Export current model CSV."
                }
                className="flex-1 p-2.5 border border-blue-300 text-blue-700 bg-white rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {activeView === "comparison" ? "Compare CSV" : "CSV"}
              </button>
              <button
                onClick={handleExportPdf}
                disabled={
                  isDownloading ||
                  (activeView === "comparison" ? !isComparing : !currentReport)
                }
                title={
                  activeView === "comparison"
                    ? "Download baseline-versus-proposed comparison PDF."
                    : "Export current model PDF."
                }
                className="flex-1 p-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {activeView === "comparison" ? "Compare PDF" : "PDF"}
              </button>
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
                    {crossoverData.length ? (
                      <div className="h-[300px] sm:h-[420px] mt-5">
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
                    ) : (
                      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                        Embodied-stage GWP is unavailable for the selected model, so this chart is intentionally not drawn as zero. Resolve the unit/data-quality warnings first.
                      </div>
                    )}
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
                                    <input type="number" min={0} value={line.row.quantity} onChange={(e) => updateRow(realIndex, { quantity: Math.max(0, n(e.target.value, 0)) })} className="w-24 p-1.5 border rounded text-right font-mono" />
                                    <span className="text-xs text-slate-500">{line.row.unit}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-right">
                                  <input type="number" min={0} value={line.row.distanceKm} onChange={(e) => updateRow(realIndex, { distanceKm: Math.max(0, n(e.target.value, 0)) })} className="w-20 p-1.5 border rounded text-right font-mono" />
                                  <span className="ml-1 text-xs">km</span>
                                </td>
                                <td className="p-3 text-right font-mono font-bold">{fmt(line.aToC.gwp, 1)}</td>
                                <td className="p-3 text-right font-mono text-emerald-700">{fmt(line.moduleD.gwp, 1)}</td>
                                {tab === "procurement" && (
                                  <td className="p-3 text-right">
                                    <input type="number" min={0} value={line.row.costPerInputUnit || ""} onChange={(e) => updateRow(realIndex, { costPerInputUnit: Math.max(0, n(e.target.value, 0)) })} className="w-24 p-1.5 border border-indigo-300 rounded text-right font-mono" placeholder="$/unit" />
                                  </td>
                                )}
                                {tab === "procurement" && <td className="p-3 text-right font-mono font-black text-indigo-700">{fmt(line.carbonPerDollar, 3)}</td>}
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1">
                                    <span
                                      className={`inline-flex px-2 py-1 rounded text-[10px] font-black ${
                                        line.epd
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {line.epd ? "EPD ✓" : "EPD ✕"}
                                    </span>
                                    <span
                                      className={`inline-flex px-2 py-1 rounded text-[10px] font-black ${
                                        line.epd && line.declaredQuantity !== null
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-amber-100 text-amber-800"
                                      }`}
                                    >
                                      {line.epd && line.declaredQuantity !== null
                                        ? "UNIT ✓"
                                        : "UNIT !"}
                                    </span>
                                    <span
                                      className={`inline-flex px-2 py-1 rounded text-[10px] font-black ${
                                        typeof line.aToC.gwp === "number"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-amber-100 text-amber-800"
                                      }`}
                                    >
                                      {typeof line.aToC.gwp === "number"
                                        ? "GWP ✓"
                                        : "GWP !"}
                                    </span>
                                  </div>
                                  {line.warnings.length > 0 && (
                                    <div
                                      title={line.warnings.join("\n")}
                                      className="mt-1 text-[10px] font-bold text-amber-700"
                                    >
                                      {line.warnings.length} warning
                                      {line.warnings.length === 1 ? "" : "s"}
                                    </div>
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-8 gap-4">
        <Kpi label="A-C GWP (available)" value={`${fmt(report.aToC.gwp, 0)} kg CO₂e`} />
        <Kpi label="GWP intensity (available)" value={`${fmt(intensity, 2)} kg CO₂e/m²`} />
        <Kpi label="Module D" value={`${fmt(report.moduleD.gwp, 0)} kg CO₂e`} />
        <Kpi label="EPD matched" value={`${report.epdMatchedRows}/${report.lines.length}`} />
        <Kpi label="Unit compatible" value={`${report.calculableRows}/${report.lines.length}`} />
        <Kpi label="Rows with any A-C GWP" value={`${report.rowsWithGwp}/${report.lines.length}`} />
        <Kpi label="Core GWP complete" value={`${report.rowsWithCompleteCoreGwp}/${report.lines.length}`} />
        <Kpi label="Project cost" value={`$${fmt(report.totalCost, 2)}`} />
      </div>

      <div className="grid xl:grid-cols-[2fr_1fr] gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="font-black text-slate-900">Lifecycle GWP by stage</h3>
          <p className="text-xs text-slate-500 mt-1">Module D is intentionally excluded. Missing stages remain unavailable and are not zero-filled.</p>
          <div className="h-[300px] sm:h-[380px] mt-4">
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
        <Kpi label="Baseline A-C intensity (available)" value={`${fmt(baselineIntensity, 2)} kg CO₂e/m²`} />
        <Kpi label="Proposed A-C intensity (available)" value={`${fmt(proposedIntensity, 2)} kg CO₂e/m²`} />
        <Kpi label="GWP reduction (available scope)" value={fmtPercent(reductionPct(baseline.aToC.gwp, proposed.aToC.gwp), 2)} />
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Comparison totals use the same available-module calculation engine as the individual models. Missing lifecycle modules remain N/A rather than being converted to zero.
      </div>

      {(baseline.rowsWithGwp < baseline.lines.length || proposed.rowsWithGwp < proposed.lines.length) && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 text-amber-950">
          <h3 className="font-black">Incomplete material-level GWP coverage</h3>
          <p className="mt-1 text-sm leading-6">
            Baseline has usable A-C GWP for {baseline.rowsWithGwp}/{baseline.lines.length} rows ({fmt(baseline.gwpRowShare, 1)}%); Proposed has {proposed.rowsWithGwp}/{proposed.lines.length} rows ({fmt(proposed.gwpRowShare, 1)}%). The displayed reduction applies only to the available scope and must not be interpreted as a complete whole-building result.
          </p>
        </div>
      )}

      {(baseline.rowsWithCompleteCoreGwp < baseline.lines.length ||
        proposed.rowsWithCompleteCoreGwp < proposed.lines.length) && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 text-amber-950">
          <h3 className="font-black">Incomplete configured core lifecycle boundary</h3>
          <p className="mt-1 text-sm leading-6">
            Every row may contain some usable GWP while still missing one or more configured core modules. Baseline is complete for {baseline.rowsWithCompleteCoreGwp}/{baseline.lines.length} rows ({fmt(baseline.coreGwpCompleteShare, 1)}%); Proposed is complete for {proposed.rowsWithCompleteCoreGwp}/{proposed.lines.length} rows ({fmt(proposed.coreGwpCompleteShare, 1)}%). The comparison remains an available-scope decision-support result, but the indicative formal reduction gate remains unavailable.
          </p>
        </div>
      )}

      <div className={`border-2 rounded-xl p-5 ${leedIndicative?.complete && leedIndicative?.passes ? "bg-emerald-50 border-emerald-300" : "bg-amber-50 border-amber-300"}`}>
        <h3 className="font-black text-slate-900">{leedIndicative?.complete ? "Indicative LEED v4 logic check" : "Indicative LEED-style assessment unavailable"}</h3>
        <p className="text-sm text-slate-700 mt-1">{leedIndicative?.reason || "Comparison unavailable."}</p>
        <p className="text-xs text-slate-500 mt-2">This is intentionally labeled indicative until the calculation core, datasets, functional equivalence and reporting workflow are independently validated.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr><th className="p-3 text-left">Impact category (available modules)</th><th className="p-3 text-right">Baseline</th><th className="p-3 text-right">Proposed</th><th className="p-3 text-right">Reduction</th></tr>
            </thead>
            <tbody>
              {metrics.map((metric: any) => (
                <tr key={metric.metric} className="border-t border-slate-100">
                  <td className="p-3 font-black">{metric.label}</td>
                  <td className="p-3 text-right font-mono">{fmtMetricValue(metric.metric, metric.baseline)} {metric.unit}</td>
                  <td className="p-3 text-right font-mono">{fmtMetricValue(metric.metric, metric.proposed)} {metric.unit}</td>
                  <td className="p-3 text-right font-mono font-black">{fmtPercent(metric.reduction, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="h-[320px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:h-[420px] sm:p-5">
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

function QualityPanel({
  report,
  epds,
  mappings,
}: {
  report: ProjectReport;
  epds: EpdRecord[];
  mappings: MaterialMapping[];
}) {
  const ec3Count = epds.filter((epd) => epd.source === "EC3").length;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 xl:grid-cols-7 gap-4">
        <Kpi
          label="EPD matched rows"
          value={`${report.epdMatchedRows}/${report.lines.length}`}
        />
        <Kpi
          label="Unit-compatible rows"
          value={`${report.calculableRows}/${report.lines.length}`}
        />
        <Kpi
          label="Rows with any A-C GWP"
          value={`${report.rowsWithGwp}/${report.lines.length}`}
        />
        <Kpi
          label="Any-GWP row coverage"
          value={`${fmt(report.gwpRowShare, 1)}%`}
        />
        <Kpi
          label="Core GWP complete"
          value={`${report.rowsWithCompleteCoreGwp}/${report.lines.length}`}
        />
        <Kpi
          label="EC3 datasets cached"
          value={ec3Count.toLocaleString()}
        />
        <Kpi label="Alias mappings" value={mappings.length.toLocaleString()} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-black text-slate-900">Row calculation status</h3>
        <p className="mt-1 text-xs text-slate-500">
          EPD matching, unit compatibility and impact-data availability are
          separate checks. A matched row is not automatically calculable.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="p-3 text-left">Material</th>
                <th className="p-3 text-left">EPD match</th>
                <th className="p-3 text-left">Unit conversion</th>
                <th className="p-3 text-left">A-C GWP data</th>
              </tr>
            </thead>
            <tbody>
              {report.lines.map((line) => (
                <tr key={line.row.id} className="border-t border-slate-100">
                  <td className="p-3 font-bold text-slate-900">
                    {line.row.materialName}
                  </td>
                  <td className="p-3">
                    {line.epd ? (
                      <span className="inline-flex rounded bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-800">
                        Matched
                      </span>
                    ) : (
                      <span className="inline-flex rounded bg-red-100 px-2 py-1 text-xs font-black text-red-800">
                        Unmapped
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {line.epd && line.declaredQuantity !== null ? (
                      <span className="inline-flex rounded bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-800">
                        Compatible
                      </span>
                    ) : line.epd ? (
                      <span className="inline-flex rounded bg-amber-100 px-2 py-1 text-xs font-black text-amber-800">
                        Needs review
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Not attempted</span>
                    )}
                  </td>
                  <td className="p-3">
                    {typeof line.aToC.gwp === "number" ? (
                      <span className="inline-flex rounded bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-800">
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex rounded bg-amber-100 px-2 py-1 text-xs font-black text-amber-800">
                        Unavailable
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="font-black text-slate-900">Warnings</h3>
        {report.warnings.length ? (
          <div className="mt-4 space-y-2 max-h-[450px] overflow-y-auto">
            {report.warnings.map((warning, index) => (
              <div
                key={`${warning}-${index}`}
                className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900"
              >
                {warning}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-emerald-700 font-bold">
            No row-level calculation warnings.
          </p>
        )}
      </div>
    </div>
  );
}

function Modal({ title, onClose, children, maxWidth = "max-w-3xl" }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-2 backdrop-blur-sm sm:p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[92vh] overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5">
          <h2 className="text-xl font-black text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-2xl font-black text-slate-400 hover:text-red-500">×</button>
        </div>
        <div className="overflow-y-auto p-4 sm:p-5">{children}</div>
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

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <label>
      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </span>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, n(e.target.value, 0)))}
        className="w-full p-2.5 bg-white border-2 border-slate-300 rounded-lg font-mono font-bold text-slate-900"
      />
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
