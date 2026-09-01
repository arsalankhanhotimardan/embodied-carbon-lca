import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DbRow = Record<string, any>;

const n = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const s = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { success: false, error: "DATABASE_URL is not configured." },
        { status: 500 }
      );
    }

    const sql = neon(process.env.DATABASE_URL);
    const url = new URL(request.url);

    const requestedYearRaw = Number(url.searchParams.get("year") || "2026");
    const requestedYear =
      Number.isInteger(requestedYearRaw) &&
      requestedYearRaw >= 2026 &&
      requestedYearRaw <= 2100
        ? requestedYearRaw
        : 2026;

    /**
     * Your existing eu_ets_pricing table remains useful as a MARKET /
     * PLANNING price feed.
     *
     * It is NOT treated as the official 2026 CBAM certificate price,
     * because the Commission publishes quarterly CBAM prices in 2026.
     */
    const planningRows = await sql`
      SELECT
        price_eur,
        updated_at
      FROM eu_ets_pricing
      WHERE price_eur IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    const planningEtsPrice =
      planningRows.length > 0 ? n(planningRows[0].price_eur) : null;

    const planningEtsUpdatedAt =
      planningRows.length > 0
        ? planningRows[0].updated_at
        : null;

    /**
     * Official CBAM certificate prices.
     *
     * 2026 = quarterly.
     * 2027 onward = weekly.
     *
     * The generic period_key lets the same table support:
     * Q1/Q2/Q3/Q4 in 2026 and e.g. 2027-W01 later.
     */
    const priceRows = await sql`
      SELECT
        reporting_year,
        period_type,
        period_key,
        quarter,
        week_number,
        period_start,
        period_end,
        price_eur,
        official,
        published_at,
        source_url
      FROM cbam_certificate_prices
      WHERE reporting_year = ${requestedYear}
      ORDER BY
        COALESCE(period_start, published_at) ASC,
        period_key ASC
    `;

    const prices = priceRows.map((row: DbRow) => ({
      year: Number(row.reporting_year),
      periodType: s(row.period_type),
      periodKey: s(row.period_key),
      quarter: s(row.quarter),
      week: n(row.week_number),
      periodStart: row.period_start,
      periodEnd: row.period_end,
      price: n(row.price_eur),
      official: Boolean(row.official),
      publishedAt: row.published_at,
      source: s(row.source_url),
    }));

    /**
     * Extended product records.
     *
     * Existing columns default_ef and actual_ef are kept for backwards
     * compatibility. New columns support the definitive-period calculation.
     */
    const productRows = await sql`
      SELECT
        id,
        name,
        cn_code AS cn,

        sector,
        country_of_origin AS country,
        production_route AS "productionRoute",

        default_ef AS "defaultEf",
        default_ef_2026 AS "defaultEf2026",
        default_ef_2027 AS "defaultEf2027",
        default_ef_2028_plus AS "defaultEf2028Plus",

        actual_ef AS "actualEf",
        actual_verified AS "actualVerified",

        cbam_benchmark AS benchmark,
        cbam_benchmark_actual AS "benchmarkActual",
        cbam_benchmark_default AS "benchmarkDefault",

        sefa_actual_2026 AS "sefaActual2026",
        sefa_default_2026 AS "sefaDefault2026",

        source,
        source_version AS "sourceVersion",
        updated_at AS "updatedAt"
      FROM cbam_products
      ORDER BY name ASC, country_of_origin ASC NULLS LAST, production_route ASC NULLS LAST
    `;

    const products = productRows.map((row: DbRow) => ({
      id: String(row.id),
      name: String(row.name ?? ""),
      cn: String(row.cn ?? ""),
      sector: s(row.sector),
      country: s(row.country),
      productionRoute: s(row.productionRoute),

      defaultEf: n(row.defaultEf),
      defaultEf2026: n(row.defaultEf2026),
      defaultEf2027: n(row.defaultEf2027),
      defaultEf2028Plus: n(row.defaultEf2028Plus),

      actualEf: n(row.actualEf),
      actualVerified: Boolean(row.actualVerified),

      benchmark: n(row.benchmark),
      benchmarkActual: n(row.benchmarkActual),
      benchmarkDefault: n(row.benchmarkDefault),

      sefaActual2026: n(row.sefaActual2026),
      sefaDefault2026: n(row.sefaDefault2026),

      source: s(row.source),
      sourceVersion: s(row.sourceVersion),
      updatedAt: row.updatedAt,
    }));

    const dataQuality = {
      totalProducts: products.length,
      missingSector: products.filter((p) => !p.sector).length,
      missingCountry: products.filter((p) => !p.country).length,
      missing2026Default: products.filter(
        (p) => p.defaultEf2026 === null && p.defaultEf === null
      ).length,
      missingBenchmarkOrSefa: products.filter(
        (p) =>
          p.benchmark === null &&
          p.benchmarkActual === null &&
          p.benchmarkDefault === null &&
          p.sefaActual2026 === null &&
          p.sefaDefault2026 === null
      ).length,
    };

    return NextResponse.json(
      {
        success: true,

        /**
         * Keep etsPrice temporarily so the OLD frontend does not crash.
         * New frontend should use planningEtsPrice + prices[].
         */
        etsPrice: planningEtsPrice,
        planningEtsPrice,
        planningEtsUpdatedAt,

        requestedYear,
        prices,
        products,
        dataQuality,

        regulatoryNotes: {
          certificatePrice2026:
            "Official CBAM certificate prices are quarterly in 2026.",
          certificatePrice2027Plus:
            "Official CBAM certificate prices are weekly from 2027 onward.",
          marketPrice:
            "planningEtsPrice is a live/planning ETS market input and is not automatically the legal CBAM certificate price for a 2026 import.",
          defaultValues:
            "Definitive-period default values are country/CN/sector specific and must use the applicable regulatory markup.",
          freeAllocation:
            "A defensible net certificate quantity requires the CBAM free-allocation adjustment (benchmark/SEFA), not merely a flat phase-in multiplier.",
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("CBAM Database Error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Database connection failed.",
      },
      { status: 500 }
    );
  }
}