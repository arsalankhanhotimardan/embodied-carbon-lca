import { neon } from "@neondatabase/serverless";

const normalizeCountry = (value: string) =>
  value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function activeElectricityVersion(sql: any) {
  const rows = (await sql`
    SELECT source_version
    FROM cbam_reference_active
    WHERE dataset_type = 'electricity_defaults'
    LIMIT 1
  `) as Array<{ source_version: string | null }>;

  return rows[0]?.source_version
    ? String(rows[0].source_version)
    : null;
}

export async function resolveElectricityDefaultValue(input: {
  country: string;
  reportingYear: number;
}) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const sql = neon(process.env.DATABASE_URL);
  const version = await activeElectricityVersion(sql);

  if (!version) {
    return {
      found: false,
      reason: "No active official electricity-default dataset is available yet.",
    };
  }

  const country = normalizeCountry(input.country);
  const rows = await sql`
    SELECT *
    FROM cbam_electricity_default_values
    WHERE source_version = ${version}
      AND country_normalized = ${country}
      AND reporting_year_from <= ${input.reportingYear}
      AND reporting_year_to >= ${input.reportingYear}
    ORDER BY reporting_year_from DESC
    LIMIT 1
  `;

  if (rows.length) {
    return {
      found: true,
      fallbackUsed: false,
      countryUsed: rows[0].country,
      emissionFactor: Number(rows[0].emission_factor_tco2_per_mwh),
      sourceVersion: rows[0].source_version,
      sourceRegulation: rows[0].source_regulation,
      sourceUrl: rows[0].source_url,
    };
  }

  // Under the electricity methodology, the Union factor is the fallback where
  // a specific third-country factor is unavailable. It must itself exist in
  // the activated official dataset; we never invent it.
  const euRows = await sql`
    SELECT *
    FROM cbam_electricity_default_values
    WHERE source_version = ${version}
      AND country_normalized IN ('european union','eu')
      AND reporting_year_from <= ${input.reportingYear}
      AND reporting_year_to >= ${input.reportingYear}
    ORDER BY reporting_year_from DESC
    LIMIT 1
  `;

  if (!euRows.length) {
    return {
      found: false,
      reason: "No country-specific electricity factor and no activated EU fallback factor were found.",
    };
  }

  return {
    found: true,
    fallbackUsed: true,
    countryUsed: euRows[0].country,
    emissionFactor: Number(euRows[0].emission_factor_tco2_per_mwh),
    sourceVersion: euRows[0].source_version,
    sourceRegulation: euRows[0].source_regulation,
    sourceUrl: euRows[0].source_url,
  };
}

export function assessActualElectricityEligibility(input: {
  ppa: boolean;
  directConnectionOrNoCongestion: boolean;
  emissionFactorTco2PerMwh: number;
  firmlyNominatedSameHour: boolean;
  accreditedVerifierCertification: boolean;
}) {
  const criteria = {
    ppa: Boolean(input.ppa),
    connection: Boolean(input.directConnectionOrNoCongestion),
    max550gPerKwh:
      Number.isFinite(input.emissionFactorTco2PerMwh) &&
      input.emissionFactorTco2PerMwh <= 0.55,
    nomination: Boolean(input.firmlyNominatedSameHour),
    verifier: Boolean(input.accreditedVerifierCertification),
  };

  return {
    eligible: Object.values(criteria).every(Boolean),
    criteria,
    warnings: Object.entries(criteria)
      .filter(([, ok]) => !ok)
      .map(([name]) => `Actual-electricity criterion not satisfied: ${name}.`),
  };
}

export function calculateElectricityCbam(input: {
  mwh: number;
  emissionFactorTco2PerMwh: number;
  certificatePriceEur: number;
}) {
  const mwh = Math.max(0, Number(input.mwh) || 0);
  const ef = Math.max(0, Number(input.emissionFactorTco2PerMwh) || 0);
  const price = Math.max(0, Number(input.certificatePriceEur) || 0);
  const embeddedEmissions = mwh * ef;

  return {
    unit: "MWh" as const,
    importedElectricityMwh: mwh,
    emissionFactorTco2PerMwh: ef,
    embeddedEmissionsTco2e: embeddedEmissions,
    freeAllocationAdjustmentTco2e: 0,
    certificatesBeforeCarbonPriceReduction: embeddedEmissions,
    grossEstimatedExposureEur: embeddedEmissions * price,
    massThresholdApplies: false,
  };
}
