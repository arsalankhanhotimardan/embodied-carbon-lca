import { createHash, timingSafeEqual } from "crypto";

export const LCA_APP_VERSION = "LCA-V2.6";
export const LCA_CALC_ENGINE_VERSION = "LCA-V2.5";
export const LCA_PROJECT_SCHEMA_VERSION = 1;

export type ProjectBomRow = {
  id: string;
  materialName: string;
  epdId?: string;
  quantity: number;
  unit: string;
  distanceKm: number;
  mode: "truck" | "rail" | "ship";
  transportModeWasDefaulted?: boolean;
  thicknessM?: number | null;
  costPerInputUnit: number;
};

export type ProjectMetadata = {
  baselineSourceName?: string | null;
  proposedSourceName?: string | null;
  baselineFingerprint?: string | null;
  proposedFingerprint?: string | null;
  ec3SessionOnlyRows?: number;
};

export type LcaProjectInput = {
  name?: unknown;
  studyPeriodYears?: unknown;
  floorAreaM2?: unknown;
  annualEnergyKwh?: unknown;
  gridIntensity?: unknown;
  baselineRows?: unknown;
  proposedRows?: unknown;
  metadata?: unknown;
};

export type SanitizedProjectInput = {
  name: string;
  studyPeriodYears: number;
  floorAreaM2: number;
  annualEnergyKwh: number;
  gridIntensity: number;
  baselineRows: ProjectBomRow[];
  proposedRows: ProjectBomRow[];
  metadata: ProjectMetadata;
};

const MAX_PROJECT_ROWS_PER_MODEL = 20_000;

const finite = (
  value: unknown,
  label: string,
  {
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
  }: { min?: number; max?: number } = {}
): number => {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
      ? Number(value)
      : NaN;

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} is invalid.`);
  }

  return parsed;
};

const cleanString = (
  value: unknown,
  label: string,
  maxLength: number,
  required = false
): string => {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) throw new Error(`${label} is required.`);
  if (text.length > maxLength) {
    throw new Error(`${label} exceeds ${maxLength} characters.`);
  }
  return text;
};

const cleanOptionalString = (
  value: unknown,
  maxLength: number
): string | undefined => {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return undefined;
  return text.slice(0, maxLength);
};

const sanitizeRows = (value: unknown, label: string): ProjectBomRow[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  if (value.length > MAX_PROJECT_ROWS_PER_MODEL) {
    throw new Error(
      `${label} exceeds the ${MAX_PROJECT_ROWS_PER_MODEL.toLocaleString()} row project limit.`
    );
  }

  return value.map((raw, index) => {
    if (!raw || typeof raw !== "object") {
      throw new Error(`${label} row ${index + 1} is invalid.`);
    }

    const row = raw as Record<string, unknown>;
    const modeText = String(row.mode || "").trim().toLowerCase();
    const mode: ProjectBomRow["mode"] =
      modeText === "rail" ? "rail" : modeText === "ship" ? "ship" : "truck";

    const thicknessRaw = row.thicknessM;
    const thicknessM =
      thicknessRaw === null || thicknessRaw === undefined || thicknessRaw === ""
        ? null
        : finite(thicknessRaw, `${label} row ${index + 1} thickness`, {
            min: 0,
            max: 1000,
          });

    const epdId = cleanOptionalString(row.epdId, 180);

    return {
      id:
        cleanString(row.id, `${label} row ${index + 1} id`, 180) ||
        `${label.toLowerCase()}-${index + 1}`,
      materialName: cleanString(
        row.materialName,
        `${label} row ${index + 1} material name`,
        400,
        true
      ),
      ...(epdId ? { epdId } : {}),
      quantity: finite(row.quantity, `${label} row ${index + 1} quantity`, {
        min: 0,
        max: 1e18,
      }),
      unit: cleanString(
        row.unit,
        `${label} row ${index + 1} unit`,
        80,
        true
      ),
      distanceKm: finite(
        row.distanceKm ?? 0,
        `${label} row ${index + 1} distance`,
        { min: 0, max: 1e8 }
      ),
      mode,
      transportModeWasDefaulted: Boolean(row.transportModeWasDefaulted),
      thicknessM,
      costPerInputUnit: finite(
        row.costPerInputUnit ?? 0,
        `${label} row ${index + 1} unit cost`,
        { min: 0, max: 1e15 }
      ),
    };
  });
};

export const sanitizeProjectInput = (
  raw: LcaProjectInput
): SanitizedProjectInput => {
  const metadataRaw =
    raw.metadata && typeof raw.metadata === "object"
      ? (raw.metadata as Record<string, unknown>)
      : {};

  const metadata: ProjectMetadata = {
    baselineSourceName:
      cleanOptionalString(metadataRaw.baselineSourceName, 260) || null,
    proposedSourceName:
      cleanOptionalString(metadataRaw.proposedSourceName, 260) || null,
    baselineFingerprint:
      cleanOptionalString(metadataRaw.baselineFingerprint, 80) || null,
    proposedFingerprint:
      cleanOptionalString(metadataRaw.proposedFingerprint, 80) || null,
    ec3SessionOnlyRows: Math.floor(
      finite(metadataRaw.ec3SessionOnlyRows ?? 0, "EC3 session-only row count", {
        min: 0,
        max: 40_000,
      })
    ),
  };

  return {
    name:
      cleanString(raw.name, "Project name", 160, true) || "Untitled LCA Project",
    studyPeriodYears: finite(raw.studyPeriodYears ?? 60, "Study period", {
      min: 0,
      max: 1000,
    }),
    floorAreaM2: finite(raw.floorAreaM2 ?? 0, "Gross floor area", {
      min: 0,
      max: 1e12,
    }),
    annualEnergyKwh: finite(raw.annualEnergyKwh ?? 0, "Annual energy", {
      min: 0,
      max: 1e15,
    }),
    gridIntensity: finite(raw.gridIntensity ?? 0, "Grid intensity", {
      min: 0,
      max: 1000,
    }),
    baselineRows: sanitizeRows(raw.baselineRows ?? [], "Baseline"),
    proposedRows: sanitizeRows(raw.proposedRows ?? [], "Proposed"),
    metadata,
  };
};

export const hashProjectToken = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex");

export const readProjectToken = (request: Request): string =>
  String(request.headers.get("x-lca-project-token") || "").trim();

export const projectTokenMatches = (
  providedToken: string,
  storedHash: string
): boolean => {
  if (!providedToken || !storedHash) return false;

  const providedHash = hashProjectToken(providedToken);

  try {
    const left = Buffer.from(providedHash, "utf8");
    const right = Buffer.from(storedHash, "utf8");
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
};
