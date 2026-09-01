import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { syncOfficialCbamPrices } from "@/lib/cbam-price-sync";
import { syncOfficialCbamReferenceData } from "@/lib/cbam-reference-sync";
import {
  cscfForYear,
  freeAllocationFactorForYear,
  priceCadenceForYear,
} from "@/lib/cbam-regulatory-calendar";
import { enforcePublicApiGuard } from "@/lib/cbam-api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { success: false, error: "DATABASE_URL is not configured." },
        { status: 500 }
      );
    }

    const guard = await enforcePublicApiGuard(request, "years", {
      limit: 120,
      windowSeconds: 300,
    });
    if (!guard.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many year/reference requests." },
        { status: 429, headers: guard.headers }
      );
    }

    const warnings: string[] = [];

    // Certificate-price updates are lightweight enough to be lazily checked
    // when the calculator is opened. The helper itself is DB-throttled.
    try {
      await syncOfficialCbamPrices({ force: false, minIntervalHours: 12 });
    } catch (error) {
      warnings.push(
        `Certificate-price refresh: ${
          error instanceof Error ? error.message : "failed"
        }`
      );
    }

    // Full reference workbooks are larger. For serverless deployments the
    // preferred automatic path is /api/cbam/sync-reference from a daily cron.
    // Operators may explicitly enable lazy on-read checking as a second layer.
    if (process.env.CBAM_AUTO_REFERENCE_SYNC_ON_READ === "true") {
      try {
        await syncOfficialCbamReferenceData({
          force: false,
          minIntervalHours: 24,
        });
      } catch (error) {
        warnings.push(
          `Reference-data refresh: ${
            error instanceof Error ? error.message : "failed"
          }`
        );
      }
    }

    const sql = neon(process.env.DATABASE_URL);

    const [priceStats, benchmarkRanges, activeRefs, syncStates] =
      await Promise.all([
        sql`
          SELECT
            reporting_year,
            COUNT(*)::integer AS total_count,
            COUNT(*) FILTER (WHERE official = TRUE)::integer AS official_count,
            MAX(updated_at) AS latest_update
          FROM cbam_certificate_prices
          GROUP BY reporting_year
          ORDER BY reporting_year
        `,
        sql`
          SELECT
            b.production_year_from,
            b.production_year_to,
            COUNT(*)::integer AS row_count
          FROM cbam_official_benchmarks b
          JOIN cbam_reference_active a
            ON a.dataset_type = 'benchmarks'
           AND a.source_version = b.source_version
          GROUP BY b.production_year_from, b.production_year_to
          ORDER BY b.production_year_from, b.production_year_to
        `,
        sql`
          SELECT
            a.dataset_type,
            a.source_version,
            d.sha256 AS source_hash,
            d.source_url,
            d.source_regulation AS legal_basis,
            d.legal_basis_url,
            d.row_count,
            d.validation,
            d.activated_at
          FROM cbam_reference_active a
          LEFT JOIN cbam_reference_datasets d
            ON d.dataset_type = a.dataset_type
           AND d.source_version = a.source_version
          ORDER BY a.dataset_type
        `,
        sql`
          SELECT
            sync_key,
            last_attempt_at,
            last_success_at,
            last_error,
            last_items_saved
          FROM cbam_sync_state
          WHERE sync_key IN (
            'official_certificate_prices',
            'official_reference_datasets'
          )
          ORDER BY sync_key
        `,
      ]);

    const defaultActive = activeRefs.find(
      (row: any) => row.dataset_type === "default_values"
    );
    const benchmarkActive = activeRefs.find(
      (row: any) => row.dataset_type === "benchmarks"
    );
    const electricityActive = activeRefs.find(
      (row: any) => row.dataset_type === "electricity_defaults"
    );

    const currentYear = Math.max(2026, new Date().getUTCFullYear());
    const maxPriceYear = priceStats.reduce(
      (max: number, row: any) =>
        Math.max(max, Number(row.reporting_year) || 0),
      0
    );
    const maxBenchmarkYear = benchmarkRanges.reduce(
      (max: number, row: any) =>
        Math.max(max, Number(row.production_year_to) || 0),
      0
    );

    // The UI always exposes the adopted 2034 phase-out horizon. Thereafter it
    // grows automatically with the calendar or newly activated official data.
    const horizonYear = Math.max(
      2034,
      currentYear + 1,
      maxPriceYear,
      maxBenchmarkYear
    );

    const priceStatsByYear = new Map<
      number,
      { total: number; official: number; latestUpdate: unknown }
    >(
      priceStats.map((row: any) => [
        Number(row.reporting_year),
        {
          total: Number(row.total_count) || 0,
          official: Number(row.official_count) || 0,
          latestUpdate: row.latest_update ?? null,
        },
      ])
    );

    const years = Array.from(
      { length: horizonYear - 2026 + 1 },
      (_, index) => 2026 + index
    ).map((year) => {
      const factor = freeAllocationFactorForYear(year);
      const cscf = cscfForYear(year);
      const benchmarkCovered = benchmarkRanges.some((range: any) => {
        const from = Number(range.production_year_from);
        const to = Number(range.production_year_to);
        return from <= year && to >= year;
      });
      const price = priceStatsByYear.get(year) ?? {
        total: 0,
        official: 0,
        latestUpdate: null,
      };

      const freeAllocationNeeded = factor !== 0;
      const referenceReady =
        Boolean(defaultActive) &&
        factor !== null &&
        (!freeAllocationNeeded || (benchmarkCovered && cscf !== null));

      let readiness: "official" | "planning-ready" | "data-pending";
      if (
        year <= currentYear &&
        referenceReady &&
        price.official > 0
      ) {
        readiness = "official";
      } else if (referenceReady) {
        readiness = "planning-ready";
      } else {
        readiness = "data-pending";
      }

      return {
        year,
        priceCadence: priceCadenceForYear(year),
        freeAllocationFactor: factor,
        cscf,
        cscfOfficial: cscf !== null,
        benchmarkCovered: benchmarkCovered || factor === 0,
        defaultValuesAvailable: Boolean(defaultActive),
        officialPriceCount: price.official,
        totalPriceCount: price.total,
        latestPriceUpdate: price.latestUpdate,
        readiness,
        productionYearChoices:
          year === 2026
            ? [2026]
            : Array.from(
                { length: year - 2026 + 1 },
                (_, i) => 2026 + i
              ),
      };
    });

    const syncStateMap = Object.fromEntries(
      syncStates.map((row: any) => [
        String(row.sync_key),
        {
          lastAttemptAt: row.last_attempt_at ?? null,
          lastSuccessAt: row.last_success_at ?? null,
          lastError: row.last_error ?? null,
          lastItemsSaved: Number(row.last_items_saved || 0),
        },
      ])
    );

    return NextResponse.json(
      {
        success: true,
        defaultYear: currentYear,
        horizonYear,
        years,
        activeReferenceDatasets: {
          defaultValues: defaultActive ?? null,
          benchmarks: benchmarkActive ?? null,
          electricityDefaults: electricityActive ?? null,
        },
        automaticSync: {
          certificatePrices: {
            enabled: true,
            minimumIntervalHours: 12,
            ...(syncStateMap.official_certificate_prices ?? {}),
          },
          referenceDatasets: {
            enabled: true,
            recommendedMode: "daily-secret-cron",
            lazyOnRead:
              process.env.CBAM_AUTO_REFERENCE_SYNC_ON_READ === "true",
            minimumIntervalHours: 24,
            ...(syncStateMap.official_reference_datasets ?? {}),
          },
          warnings,
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
    console.error("CBAM years API failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "CBAM reporting-year lookup failed.",
      },
      { status: 500 }
    );
  }
}
