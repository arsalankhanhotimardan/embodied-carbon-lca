import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { resolveOfficialCbamReference } from "@/lib/cbam-official-reference";
import {
  calculateActualCbamGood,
  type ActualGoodInput,
} from "@/lib/cbam-actual-engine";
import {
  calculateElectricityCbam,
  assessActualElectricityEligibility,
  resolveElectricityDefaultValue,
} from "@/lib/cbam-electricity";
import { assessAnnualMassThreshold } from "@/lib/cbam-regulatory-calendar";
import { evaluateCarbonPriceClaim } from "@/lib/cbam-carbon-price";
import {
  boundedNumber,
  boundedText,
  enforcePublicApiGuard,
  readJsonWithLimit,
} from "@/lib/cbam-api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body =
  | {
      kind: "default";
      cnCode: string;
      country: string;
      reportingYear: number;
      productionYear?: number | null;
      tonnes: number;
      certificatePriceEur: number;
      priorYtdEligibleMassTonnes?: number;
      carbonPriceClaim?: any;
    }
  | {
      kind: "actual";
      reportingYear: number;
      tonnes: number;
      certificatePriceEur: number;
      priorYtdEligibleMassTonnes?: number;
      good: ActualGoodInput;
      carbonPriceClaim?: any;
    }
  | {
      kind: "electricity";
      country: string;
      reportingYear: number;
      mwh: number;
      certificatePriceEur: number;
      mode: "default" | "actual";
      actualEmissionFactorTco2PerMwh?: number;
      actualCriteria?: any;
      carbonPriceClaim?: any;
    };

function finaliseCertificates(input: {
  certificatesBeforeCarbonPriceReduction: number | null;
  thresholdExempt: boolean;
  carbonPriceClaim: Awaited<ReturnType<typeof evaluateCarbonPriceClaim>>;
  certificatePriceEur: number;
}) {
  const grossAfterThreshold = input.thresholdExempt
    ? 0
    : input.certificatesBeforeCarbonPriceReduction;

  const grossExposureAfterThreshold =
    grossAfterThreshold === null
      ? null
      : grossAfterThreshold * input.certificatePriceEur;

  const claimPending =
    input.carbonPriceClaim.status !== "not-claimed" &&
    input.carbonPriceClaim.certificateReduction === null;

  const finalCertificatesAfterCarbonPrice = claimPending
    ? null
    : grossAfterThreshold === null
      ? null
      : Math.max(
          0,
          grossAfterThreshold -
            Number(input.carbonPriceClaim.certificateReduction ?? 0)
        );

  return {
    certificatesAfterThresholdBeforeCarbonPrice: grossAfterThreshold,
    grossExposureAfterThresholdEur: grossExposureAfterThreshold,
    carbonPriceConversionPending: claimPending,
    finalCertificatesAfterCarbonPrice,
    finalEstimatedExposureEur:
      finalCertificatesAfterCarbonPrice === null
        ? null
        : finalCertificatesAfterCarbonPrice * input.certificatePriceEur,
  };
}

async function saveActualAudit(input: {
  calculationId: string;
  reportingYear: number;
  productionYear?: number | null;
  cnCode?: string | null;
  country?: string | null;
  verifiedInput: boolean;
  inputData: unknown;
  resultData: unknown;
}) {
  // Audit is useful for reproducibility, but it must never break a user
  // calculation if the optional audit table is temporarily unavailable.
  if (!process.env.DATABASE_URL) return;
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      INSERT INTO cbam_actual_calculation_audit (
        calculation_id,
        reporting_year,
        production_year,
        cn_code,
        country,
        verified_input,
        input_data,
        result_data
      ) VALUES (
        ${input.calculationId},
        ${input.reportingYear},
        ${input.productionYear ?? null},
        ${input.cnCode ?? null},
        ${input.country ?? null},
        ${input.verifiedInput},
        ${JSON.stringify(input.inputData)}::jsonb,
        ${JSON.stringify(input.resultData)}::jsonb
      )
      ON CONFLICT (calculation_id) DO NOTHING
    `;
  } catch (error) {
    console.error("CBAM actual audit write failed:", error);
  }
}

export async function POST(request: Request) {
  try {
    const guard = await enforcePublicApiGuard(request, "calculate", {
      limit: 90,
      windowSeconds: 300,
    });

    if (!guard.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many calculation requests." },
        { status: 429, headers: guard.headers }
      );
    }

    const body = await readJsonWithLimit<Body>(request, 512_000);
    const reportingYear = Math.trunc(
      boundedNumber((body as any).reportingYear, {
        min: 2026,
        max: 2200,
        fallback: 2026,
      })
    );
    const price = boundedNumber((body as any).certificatePriceEur, {
      min: 0,
      max: 1_000_000,
      fallback: 0,
    });

    if (body.kind === "electricity") {
      const country = boundedText(body.country, 120);
      const mwh = boundedNumber(body.mwh, {
        min: 0,
        max: 1_000_000_000,
      });
      let ef: number | null = null;
      let source: any = null;
      const warnings: string[] = [];
      let actualEligibility: ReturnType<
        typeof assessActualElectricityEligibility
      > | null = null;

      if (body.mode === "actual") {
        ef = boundedNumber(body.actualEmissionFactorTco2PerMwh, {
          min: 0,
          max: 100,
        });
        actualEligibility = assessActualElectricityEligibility({
          ppa: Boolean(body.actualCriteria?.ppa),
          directConnectionOrNoCongestion: Boolean(
            body.actualCriteria?.directConnectionOrNoCongestion
          ),
          emissionFactorTco2PerMwh: ef,
          firmlyNominatedSameHour: Boolean(
            body.actualCriteria?.firmlyNominatedSameHour
          ),
          accreditedVerifierCertification: Boolean(
            body.actualCriteria?.accreditedVerifierCertification
          ),
        });
        if (!actualEligibility.eligible) {
          warnings.push(...actualEligibility.warnings);
        }
        source = { actualEligibility };
      } else {
        const resolved = await resolveElectricityDefaultValue({
          country,
          reportingYear,
        });
        if (!resolved.found) {
          return NextResponse.json(
            { success: false, error: resolved.reason },
            { status: 422, headers: guard.headers }
          );
        }
        ef = Number(resolved.emissionFactor);
        source = resolved;
      }

      const gross = calculateElectricityCbam({
        mwh,
        emissionFactorTco2PerMwh: ef!,
        certificatePriceEur: price,
      });
      const carbon = await evaluateCarbonPriceClaim({
        claimRequested: Boolean(body.carbonPriceClaim?.claimRequested),
        emissionsMode: body.mode,
        reportingYear,
        country,
        ...body.carbonPriceClaim,
      });

      // Electricity is outside the 50 t mass threshold and has no free
      // allocation adjustment. Actual electricity that fails its eligibility
      // criteria is returned as a scenario only; we deliberately withhold a
      // declaration-style final certificate number.
      const finalised = finaliseCertificates({
        certificatesBeforeCarbonPriceReduction:
          gross.certificatesBeforeCarbonPriceReduction,
        thresholdExempt: false,
        carbonPriceClaim: carbon,
        certificatePriceEur: price,
      });
      const declarationReady =
        body.mode === "default" || Boolean(actualEligibility?.eligible);

      return NextResponse.json(
        {
          success: true,
          data: {
            kind: "electricity",
            reportingYear,
            ...gross,
            source,
            carbonPriceClaim: carbon,
            ...finalised,
            declarationReady,
            warnings: [...warnings, ...carbon.warnings],
            ...(declarationReady
              ? {}
              : {
                  finalCertificatesAfterCarbonPrice: null,
                  finalEstimatedExposureEur: null,
                }),
          },
        },
        {
          headers: {
            ...guard.headers,
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (body.kind === "actual") {
      const actual = await calculateActualCbamGood(body.good, {
        reportingYear,
      });
      const mass = boundedNumber(body.tonnes, {
        min: 0,
        max: 1_000_000_000,
      });
      const embedded = mass * actual.specificEmbeddedEmissions;
      const freeAllocation =
        actual.sefa === null ? null : mass * actual.sefa;
      const certificates =
        freeAllocation === null
          ? null
          : Math.max(0, embedded - freeAllocation);
      const threshold = assessAnnualMassThreshold({
        sector: actual.sector,
        priorYtdEligibleMassTonnes: Number(
          body.priorYtdEligibleMassTonnes
        ) || 0,
        currentMassTonnes: mass,
      });
      const carbon = await evaluateCarbonPriceClaim({
        claimRequested: Boolean(body.carbonPriceClaim?.claimRequested),
        emissionsMode: "actual",
        reportingYear,
        country: boundedText(body.good.country, 120),
        ...body.carbonPriceClaim,
      });
      const finalised = finaliseCertificates({
        certificatesBeforeCarbonPriceReduction: certificates,
        thresholdExempt: threshold.exempt,
        carbonPriceClaim: carbon,
        certificatePriceEur: price,
      });

      const data = {
        kind: "actual" as const,
        reportingYear,
        actual,
        importedMassTonnes: mass,
        embeddedEmissionsTco2e: embedded,
        freeAllocationAdjustmentTco2e: freeAllocation,
        certificatesBeforeCarbonPriceReduction: certificates,
        threshold,
        carbonPriceClaim: carbon,
        ...finalised,
        declarationReady: actual.declarationReady,
      };

      await saveActualAudit({
        calculationId: actual.calculationId,
        reportingYear,
        productionYear: body.good.productionYear ?? null,
        cnCode: body.good.cnCode,
        country: body.good.country,
        verifiedInput: Boolean(body.good.verified),
        inputData: body.good,
        resultData: data,
      });

      return NextResponse.json(
        { success: true, data },
        {
          headers: {
            ...guard.headers,
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const cnCode = boundedText(body.cnCode, 24);
    const country = boundedText(body.country, 120);
    const productionYear =
      body.productionYear === null || body.productionYear === undefined
        ? null
        : Math.trunc(
            boundedNumber(body.productionYear, {
              min: 2026,
              max: reportingYear,
              fallback: reportingYear,
            })
          );

    const ref = await resolveOfficialCbamReference({
      cnCode,
      country,
      reportingYear,
      productionYear,
      mode: "default",
    });
    if (!ref.found) {
      return NextResponse.json(
        { success: false, error: ref.reason, data: ref },
        { status: 422, headers: guard.headers }
      );
    }

    const mass = boundedNumber(body.tonnes, {
      min: 0,
      max: 1_000_000_000,
    });
    const ef = ref.defaultValue?.markedUpTotalEmissions;
    if (ef === null || ef === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Official marked-up default emissions are unavailable.",
        },
        { status: 422, headers: guard.headers }
      );
    }

    const embedded = mass * ef;
    const freeAllocation =
      ref.simpleDefaultSefa === null
        ? null
        : mass * Number(ref.simpleDefaultSefa);
    const certificates =
      freeAllocation === null
        ? null
        : Math.max(0, embedded - freeAllocation);
    const threshold = assessAnnualMassThreshold({
      sector: ref.defaultValue?.sector,
      priorYtdEligibleMassTonnes:
        Number(body.priorYtdEligibleMassTonnes) || 0,
      currentMassTonnes: mass,
    });
    const carbon = await evaluateCarbonPriceClaim({
      claimRequested: Boolean(body.carbonPriceClaim?.claimRequested),
      emissionsMode: "default",
      reportingYear,
      country,
      ...body.carbonPriceClaim,
    });
    const finalised = finaliseCertificates({
      certificatesBeforeCarbonPriceReduction: certificates,
      thresholdExempt: threshold.exempt,
      carbonPriceClaim: carbon,
      certificatePriceEur: price,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          kind: "default",
          reportingYear,
          productionYear,
          reference: ref,
          importedMassTonnes: mass,
          embeddedEmissionsTco2e: embedded,
          freeAllocationAdjustmentTco2e: freeAllocation,
          certificatesBeforeCarbonPriceReduction: certificates,
          threshold,
          carbonPriceClaim: carbon,
          ...finalised,
          declarationReady:
            ref.simpleDefaultSefa !== null &&
            finalised.finalCertificatesAfterCarbonPrice !== null,
        },
      },
      {
        headers: {
          ...guard.headers,
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("CBAM calculation failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "CBAM calculation failed.",
      },
      { status: 400 }
    );
  }
}
