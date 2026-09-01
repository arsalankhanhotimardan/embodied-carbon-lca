import crypto from "node:crypto";
import { resolveOfficialCbamReference } from "@/lib/cbam-official-reference";
import {
  cscfForYear,
  effectiveRegulatoryYear,
  freeAllocationFactorForYear,
  includedActualSpecificEmissions,
} from "@/lib/cbam-regulatory-calendar";

export type ActualPrecursorInput = {
  name?: string;
  cnCode: string;
  country: string;
  massTonnes: number;
  productionYear?: number | null;
  productionRouteIndicator?: string | null;
  source: "actual" | "default" | "exempt";
  actual?: ActualGoodInput;
};

export type ActualGoodInput = {
  name?: string;
  cnCode: string;
  country: string;
  sector?: string | null;
  productionYear?: number | null;
  productionRouteIndicator?: string | null;
  activityLevelTonnes: number;
  processDirectEmissionsTco2e: number;
  processIndirectEmissionsTco2e?: number;
  verified?: boolean;
  precursors?: ActualPrecursorInput[];
};

export type ActualCalculationContext = {
  reportingYear: number;
};

type NodeResult = {
  cnCode: string;
  country: string;
  sector: string | null;
  regulatoryYear: number;
  verified: boolean;
  activityLevelTonnes: number;
  specificEmbeddedEmissions: number;
  processSpecificIncludedEmissions: number;
  sefa: number | null;
  processSfa: number | null;
  benchmark: number | null;
  benchmarkRoute: string | null;
  precursors: Array<{
    name: string | null;
    cnCode: string;
    source: string;
    massTonnes: number;
    specificMassTonnesPerTonneGood: number;
    specificEmbeddedEmissions: number;
    sefa: number | null;
    contributionEmbeddedEmissions: number;
    contributionSefa: number | null;
    detail?: NodeResult;
  }>;
  warnings: string[];
};

async function calculateNode(
  node: ActualGoodInput,
  context: ActualCalculationContext,
  depth = 0
): Promise<NodeResult> {
  if (depth > 12) throw new Error("Actual-data precursor recursion exceeds the safety limit.");

  const activity = Number(node.activityLevelTonnes);
  if (!Number.isFinite(activity) || activity <= 0) {
    throw new Error("Activity level must be greater than zero for actual-data calculations.");
  }

  const regulatoryYear = effectiveRegulatoryYear({
    reportingYear: context.reportingYear,
    productionYear: node.productionYear,
  });

  const reference = await resolveOfficialCbamReference({
    cnCode: node.cnCode,
    country: node.country,
    reportingYear: context.reportingYear,
    productionYear: node.productionYear,
    mode: "actual",
    productionRouteIndicator: node.productionRouteIndicator ?? null,
  });

  if (!reference.found) {
    throw new Error(reference.reason || `No official benchmark context found for ${node.cnCode}.`);
  }

  const sector = String(reference.defaultValue?.sector ?? node.sector ?? "") || null;
  const directPerTonne = Math.max(0, Number(node.processDirectEmissionsTco2e) || 0) / activity;
  const indirectPerTonne = Math.max(0, Number(node.processIndirectEmissionsTco2e) || 0) / activity;
  const included = includedActualSpecificEmissions({
    sector,
    processDirectPerTonne: directPerTonne,
    processIndirectPerTonne: indirectPerTonne,
  });

  const benchmark = reference.benchmark?.value ?? null;
  const factor = freeAllocationFactorForYear(regulatoryYear);
  const cscf = cscfForYear(regulatoryYear);

  const processSfa =
    factor === 0
      ? 0
      : benchmark !== null && factor !== null && cscf !== null
        ? benchmark * factor * cscf
        : null;

  const precursorResults: NodeResult["precursors"] = [];
  let precursorEmbedded = 0;
  let precursorSefa = 0;
  let sefaComplete = processSfa !== null;
  const warnings = [...(reference.warnings ?? [])];

  for (const precursor of node.precursors ?? []) {
    const mass = Math.max(0, Number(precursor.massTonnes) || 0);
    const specificMass = mass / activity;

    if (precursor.source === "exempt") {
      precursorResults.push({
        name: precursor.name ?? null,
        cnCode: precursor.cnCode,
        source: "exempt",
        massTonnes: mass,
        specificMassTonnesPerTonneGood: specificMass,
        specificEmbeddedEmissions: 0,
        sefa: 0,
        contributionEmbeddedEmissions: 0,
        contributionSefa: 0,
      });
      continue;
    }

    if (precursor.source === "default") {
      const defaultReference = await resolveOfficialCbamReference({
        cnCode: precursor.cnCode,
        country: precursor.country,
        reportingYear: context.reportingYear,
        productionYear: precursor.productionYear ?? node.productionYear ?? null,
        mode: "default",
        productionRouteIndicator: precursor.productionRouteIndicator ?? null,
      });

      if (!defaultReference.found) {
        throw new Error(
          defaultReference.reason || `No default reference found for precursor ${precursor.cnCode}.`
        );
      }

      const see = defaultReference.defaultValue?.markedUpTotalEmissions;
      const sefa = defaultReference.simpleDefaultSefa;
      if (see === null || see === undefined) {
        throw new Error(`Default embedded emissions are unavailable for precursor ${precursor.cnCode}.`);
      }

      const embeddedContribution = specificMass * see;
      const sefaContribution = sefa === null || sefa === undefined ? null : specificMass * sefa;
      precursorEmbedded += embeddedContribution;
      if (sefaContribution === null) sefaComplete = false;
      else precursorSefa += sefaContribution;

      precursorResults.push({
        name: precursor.name ?? null,
        cnCode: precursor.cnCode,
        source: "default",
        massTonnes: mass,
        specificMassTonnesPerTonneGood: specificMass,
        specificEmbeddedEmissions: see,
        sefa: sefa ?? null,
        contributionEmbeddedEmissions: embeddedContribution,
        contributionSefa: sefaContribution,
      });
      continue;
    }

    if (!precursor.actual) {
      throw new Error(`Actual precursor ${precursor.cnCode} is missing its nested actual-data record.`);
    }

    const detail = await calculateNode(
      {
        ...precursor.actual,
        cnCode: precursor.cnCode,
        country: precursor.country,
        productionYear: precursor.productionYear ?? precursor.actual.productionYear,
        productionRouteIndicator:
          precursor.productionRouteIndicator ?? precursor.actual.productionRouteIndicator,
      },
      context,
      depth + 1
    );

    const embeddedContribution = specificMass * detail.specificEmbeddedEmissions;
    const sefaContribution = detail.sefa === null ? null : specificMass * detail.sefa;
    precursorEmbedded += embeddedContribution;
    if (sefaContribution === null) sefaComplete = false;
    else precursorSefa += sefaContribution;

    precursorResults.push({
      name: precursor.name ?? null,
      cnCode: precursor.cnCode,
      source: "actual",
      massTonnes: mass,
      specificMassTonnesPerTonneGood: specificMass,
      specificEmbeddedEmissions: detail.specificEmbeddedEmissions,
      sefa: detail.sefa,
      contributionEmbeddedEmissions: embeddedContribution,
      contributionSefa: sefaContribution,
      detail,
    });
  }

  if (!node.verified) {
    warnings.push(
      "Actual emissions inputs are not marked as verified by an accredited verifier; results are planning-only."
    );
  }
  if (processSfa === null) {
    warnings.push(
      "Process-level specific free allocation could not be completed because an applicable benchmark/CSCF is unavailable."
    );
  }

  const specificEmbeddedEmissions = included.totalIncluded + precursorEmbedded;
  const sefa = sefaComplete && processSfa !== null ? processSfa + precursorSefa : null;

  return {
    cnCode: node.cnCode,
    country: node.country,
    sector,
    regulatoryYear,
    verified: Boolean(node.verified),
    activityLevelTonnes: activity,
    specificEmbeddedEmissions,
    processSpecificIncludedEmissions: included.totalIncluded,
    sefa,
    processSfa,
    benchmark,
    benchmarkRoute: reference.benchmark?.productionRouteIndicator ?? null,
    precursors: precursorResults,
    warnings,
  };
}

export async function calculateActualCbamGood(
  good: ActualGoodInput,
  context: ActualCalculationContext
) {
  const result = await calculateNode(good, context);
  return {
    calculationId: crypto.randomUUID(),
    methodology: {
      embeddedEmissions: "process specific emissions + Σ(specific precursor mass × precursor SEE)",
      processSfa: "CBAM factor × CSCF × Column A process benchmark",
      complexSefa: "process SFA + Σ(specific precursor mass × precursor SEFA)",
    },
    ...result,
    declarationReady:
      result.verified && result.sefa !== null && result.warnings.every((w) => !/unavailable|could not/i.test(w)),
  };
}
