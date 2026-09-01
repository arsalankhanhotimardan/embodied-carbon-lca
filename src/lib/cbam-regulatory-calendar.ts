export type CbamCoreSector =
  | "cement"
  | "iron_steel"
  | "aluminium"
  | "fertiliser"
  | "hydrogen"
  | "electricity";

export const FREE_ALLOCATION_CBAM_FACTOR: Record<number, number> = {
  2026: 0.975,
  2027: 0.95,
  2028: 0.9,
  2029: 0.775,
  2030: 0.515,
  2031: 0.39,
  2032: 0.265,
  2033: 0.14,
  2034: 0,
};

export const OFFICIAL_CSCF: Record<number, number> = {
  2026: 1,
  2027: 1,
  2028: 1,
  2029: 1,
  2030: 1,
};

export const THRESHOLD_ELIGIBLE_SECTORS = new Set<CbamCoreSector>([
  "cement",
  "iron_steel",
  "aluminium",
  "fertiliser",
]);

export const DIRECT_ONLY_SECTORS = new Set<CbamCoreSector>([
  "iron_steel",
  "aluminium",
  "hydrogen",
  "electricity",
]);

export function freeAllocationFactorForYear(year: number): number | null {
  if (year >= 2034) return 0;
  return FREE_ALLOCATION_CBAM_FACTOR[year] ?? null;
}

export function cscfForYear(year: number): number | null {
  if (year >= 2034) return null; // irrelevant because the CBAM factor is zero
  return OFFICIAL_CSCF[year] ?? null;
}

/**
 * Article-7/Methodology reporting-period helper used by the benchmark/SEFA engine.
 *
 * - 2026 imports always use 2026, independently of actual production time.
 * - From 2027 onward, a substantiated production year can be used.
 * - Without substantiated production-year evidence, the import/reporting year is used.
 */
export function effectiveRegulatoryYear(input: {
  reportingYear: number;
  productionYear?: number | null;
}): number {
  const reportingYear = Math.trunc(input.reportingYear);
  const productionYear =
    input.productionYear === null || input.productionYear === undefined
      ? null
      : Math.trunc(input.productionYear);

  if (reportingYear < 2026 || reportingYear > 2200) {
    throw new Error("Reporting year must be 2026 or later.");
  }

  if (reportingYear === 2026) return 2026;

  if (productionYear === null) return reportingYear;
  if (productionYear < 2026) {
    throw new Error("A CBAM production year earlier than 2026 is not supported for definitive-period calculations.");
  }
  if (productionYear > reportingYear) {
    throw new Error("Production year cannot be later than the reporting/import year.");
  }

  return productionYear;
}

export function priceCadenceForYear(year: number): "quarterly" | "weekly" {
  return year === 2026 ? "quarterly" : "weekly";
}

export function isMassThresholdEligibleSector(
  sector: string | null | undefined
): boolean {
  return THRESHOLD_ELIGIBLE_SECTORS.has(sector as CbamCoreSector);
}

export function assessAnnualMassThreshold(input: {
  sector: string | null | undefined;
  priorYtdEligibleMassTonnes: number;
  currentMassTonnes: number;
}) {
  const eligible = isMassThresholdEligibleSector(input.sector);
  const prior = Math.max(0, Number(input.priorYtdEligibleMassTonnes) || 0);
  const current = Math.max(0, Number(input.currentMassTonnes) || 0);
  const annualAfter = prior + current;

  if (!eligible) {
    return {
      eligible: false,
      exempt: false,
      priorYtdEligibleMassTonnes: prior,
      annualEligibleMassAfterTonnes: annualAfter,
      crossedThresholdThisImport: false,
      requiresYtdRecalculation: false,
      reason: "This sector is not covered by the 50-tonne mass-based de-minimis threshold.",
    };
  }

  const exempt = annualAfter <= 50;
  const crossed = prior <= 50 && annualAfter > 50;

  return {
    eligible: true,
    exempt,
    priorYtdEligibleMassTonnes: prior,
    annualEligibleMassAfterTonnes: annualAfter,
    crossedThresholdThisImport: crossed,
    requiresYtdRecalculation: crossed,
    reason: exempt
      ? "Cumulative annual threshold-eligible mass does not exceed 50 tonnes."
      : crossed
        ? "This import takes cumulative annual threshold-eligible mass above 50 tonnes; earlier relevant imports in the same calendar year must be included in the annual CBAM position."
        : "Cumulative annual threshold-eligible mass exceeds 50 tonnes.",
  };
}

export function includedActualSpecificEmissions(input: {
  sector: string | null | undefined;
  processDirectPerTonne: number;
  processIndirectPerTonne: number;
}) {
  const direct = Math.max(0, input.processDirectPerTonne || 0);
  const indirect = Math.max(0, input.processIndirectPerTonne || 0);
  const directOnly = DIRECT_ONLY_SECTORS.has(input.sector as CbamCoreSector);

  return {
    direct,
    indirectReported: indirect,
    indirectIncluded: directOnly ? 0 : indirect,
    totalIncluded: direct + (directOnly ? 0 : indirect),
    directOnly,
  };
}
