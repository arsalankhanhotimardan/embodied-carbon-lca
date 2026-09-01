import { neon } from "@neondatabase/serverless";

export type CarbonPriceClaimInput = {
  claimRequested?: boolean;
  emissionsMode: "actual" | "default";
  carbonPriceMode?: "effectively_paid" | "commission_default";
  reportingYear: number;
  country: string;
  netCarbonPriceEurPerTco2e?: number | null;
  tonnesCo2eCovered?: number | null;
  independentCertification?: boolean;
  paymentEvidence?: boolean;
};

/**
 * Article 9 engine.
 *
 * Crucially, this function does NOT subtract a monetary carbon-price amount
 * directly from CBAM cost. The CBAM Regulation requires conversion into a
 * corresponding reduction of certificates under Commission implementing rules.
 * Until an active conversion rule is configured, the reduction is withheld.
 */
export async function evaluateCarbonPriceClaim(input: CarbonPriceClaimInput) {
  if (!input.claimRequested) {
    return {
      status: "not-claimed" as const,
      certificateReduction: 0,
      canApplyAutomatically: true,
      warnings: [] as string[],
    };
  }

  const warnings: string[] = [];
  const mode = input.carbonPriceMode ?? "effectively_paid";

  if (input.emissionsMode === "default" && mode !== "commission_default") {
    warnings.push(
      "When embedded emissions are based on default values, an Article 9 reduction may only be claimed by reference to a yearly default carbon price."
    );
  }

  if (mode === "effectively_paid") {
    if (!input.independentCertification) {
      warnings.push("Independent certification of the carbon-price evidence has not been confirmed.");
    }
    if (!input.paymentEvidence) {
      warnings.push("Evidence that the carbon price was effectively paid has not been confirmed.");
    }
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const sql = neon(process.env.DATABASE_URL);
  const activeRules = await sql`
    SELECT rule_version, legal_basis, legal_basis_url, method
    FROM cbam_carbon_price_conversion_rules
    WHERE status = 'active'
      AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
    ORDER BY effective_from DESC NULLS LAST, activated_at DESC NULLS LAST
    LIMIT 1
  `;

  if (!activeRules.length) {
    return {
      status: "pending-regulatory-conversion" as const,
      certificateReduction: null,
      canApplyAutomatically: false,
      warnings: [
        ...warnings,
        "Carbon-price-paid evidence can be recorded, but this application is not converting it into a certificate reduction until the applicable Commission conversion methodology is activated.",
      ],
      legalBasis: "Regulation (EU) 2023/956 as amended, Article 9",
    };
  }

  // Deliberately fail closed. A future legal rule must be implemented in code,
  // not merely toggled in the database.
  return {
    status: "rule-present-code-review-required" as const,
    certificateReduction: null,
    canApplyAutomatically: false,
    activeRule: {
      version: String(activeRules[0].rule_version),
      legalBasis: activeRules[0].legal_basis,
      legalBasisUrl: activeRules[0].legal_basis_url,
    },
    warnings: [
      ...warnings,
      "An active database rule exists, but automatic certificate conversion remains disabled until its adopted formula is implemented and regression-tested in application code.",
    ],
  };
}
