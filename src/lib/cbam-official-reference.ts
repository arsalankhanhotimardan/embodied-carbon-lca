import { neon } from "@neondatabase/serverless";
import {
  cscfForYear,
  effectiveRegulatoryYear,
  freeAllocationFactorForYear,
} from "@/lib/cbam-regulatory-calendar";

export type CbamSector =
  | "cement"
  | "iron_steel"
  | "aluminium"
  | "fertiliser"
  | "hydrogen"
  | "electricity"
  | string;

const DEFAULTS_VERSION = "EU-default-values-corrected-2026-08-10";
const BENCHMARKS_VERSION = "EU-benchmarks-2026-02-13";

const ROUTE_LABELS: Record<string, string> = {
  A: "grey clinker / cement",
  B: "white clinker / cement",
  C: "Carbon Steel based on BF/BOF",
  D: "Carbon Steel based on DRI/EAF",
  E: "Carbon Steel based on Scrap/EAF",
  F: "Low alloy Steel based on BF/BOF",
  G: "Low alloy Steel based on DRI/EAF",
  H: "Low alloy Steel based on Scrap/EAF",
  J: "High alloy Steel based on EAF",
  K: "primary Aluminium",
  L: "secondary Aluminium",
};

const digitsOnly = (value: string) => value.replace(/\D/g, "");

// IMPORTANT: keep this normalization identical to the official-data importer.
// Existing Neon rows were imported using this exact transformation.
const normalizeCountry = (value: string) =>
  value
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const defaultMarkupMultiplier = (
  sector: CbamSector | null,
  year: number
): number | null => {
  if (sector === "fertiliser") return 1.01;

  if (
    sector === "cement" ||
    sector === "iron_steel" ||
    sector === "aluminium" ||
    sector === "hydrogen"
  ) {
    if (year === 2026) return 1.10;
    if (year === 2027) return 1.20;
    if (year >= 2028) return 1.30;
  }

  // Electricity has a separate default-value methodology.
  if (sector === "electricity") return null;

  return null;
};

export async function resolveOfficialCbamReference(input: {
  cnCode: string;
  country: string;
  /** @deprecated use reportingYear */
  year?: number;
  reportingYear?: number;
  productionYear?: number | null;
  mode?: "default" | "actual";
  productionRouteIndicator?: string | null;
}) {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const sql = neon(process.env.DATABASE_URL);

  const activeVersion = async (datasetType: "default_values" | "benchmarks", fallback: string) => {
    const rows = await sql`
      SELECT source_version
      FROM cbam_reference_active
      WHERE dataset_type = ${datasetType}
      LIMIT 1
    `;
    return rows[0]?.source_version ? String(rows[0].source_version) : fallback;
  };

  const defaultsVersion = await activeVersion("default_values", DEFAULTS_VERSION);
  const benchmarksVersion = await activeVersion("benchmarks", BENCHMARKS_VERSION);

  const reportingYear = input.reportingYear ?? input.year ?? 2026;
  const regulatoryYear = effectiveRegulatoryYear({
    reportingYear,
    productionYear: input.productionYear ?? null,
  });
  const mode = input.mode ?? "default";
  const cn = digitsOnly(input.cnCode);
  const country = normalizeCountry(input.country);

  if (cn.length < 4) {
    throw new Error("A valid CN/HS/TARIC code is required.");
  }

  if (!country) {
    throw new Error("Country of origin is required.");
  }

  /**
   * 1) Resolve the official default-value row across the CN/TARIC hierarchy.
   *
   * The Commission default-value workbook can contain 10-digit TARIC codes
   * while the benchmark workbook commonly uses 8-digit CN codes.
   *
   * We therefore support:
   * - exact match:           25232900 -> 25232900
   * - parent match:          2523100090 -> 25231000
   * - child match:           25231000 -> 2523100090
   *
   * If a less-specific input expands to several different regulatory child
   * rows, we do NOT guess. We return an ambiguity and ask for a more-specific
   * CN/TARIC code.
   */
  const fetchDefaultRows = async (countryNormalized: string) => {
    return sql`
      SELECT *
      FROM cbam_official_default_values
      WHERE source_version = ${defaultsVersion}
        AND country_normalized = ${countryNormalized}
        AND (
          cn_digits = ${cn}
          OR ${cn} LIKE cn_digits || '%'
          OR cn_digits LIKE ${cn} || '%'
        )
      ORDER BY
        CASE
          WHEN cn_digits = ${cn} THEN 0
          WHEN ${cn} LIKE cn_digits || '%' THEN 1
          WHEN cn_digits LIKE ${cn} || '%' THEN 2
          ELSE 3
        END ASC,
        ABS(cn_digits_length - ${cn.length}) ASC,
        cn_digits_length DESC,
        source_row ASC
      LIMIT 100
    `;
  };

  const countryRows = await fetchDefaultRows(country);
  const fallbackRows = await fetchDefaultRows(
    "other countries and territories"
  );

  type DefaultResolution =
    | {
        row: any;
        matchType: "exact" | "parent" | "child";
        ambiguous: false;
        candidates: any[];
      }
    | {
        row: null;
        matchType: "child" | null;
        ambiguous: true;
        candidates: any[];
      }
    | {
        row: null;
        matchType: null;
        ambiguous: false;
        candidates: any[];
      };

  const summarizeCandidate = (row: any) => ({
    cnCode: row.cn_code,
    cnDigits: row.cn_digits,
    description: row.description,
    sector: row.sector,
    totalEmissions:
      row.total_emissions === null
        ? null
        : Number(row.total_emissions),
    productionRouteIndicator:
      row.production_route_indicator ?? null,
    productionRouteLabel:
      row.production_route_label ?? null,
    country: row.country,
  });

  const chooseDefaultRow = (rows: any[]): DefaultResolution => {
    if (!rows.length) {
      return {
        row: null,
        matchType: null,
        ambiguous: false,
        candidates: [],
      };
    }

    const exact = rows.filter(
      (r) => String(r.cn_digits) === cn
    );

    if (exact.length) {
      const usable =
        exact.find((r) => r.total_emissions !== null) ??
        exact[0];

      return {
        row: usable,
        matchType: "exact",
        ambiguous: false,
        candidates: exact,
      };
    }

    // Input is more specific than the stored regulatory key.
    const parents = rows.filter((r) => {
      const stored = String(r.cn_digits);
      return stored.length < cn.length && cn.startsWith(stored);
    });

    if (parents.length) {
      const longestLength = Math.max(
        ...parents.map((r) => Number(r.cn_digits_length))
      );

      const closestParents = parents.filter(
        (r) => Number(r.cn_digits_length) === longestLength
      );

      const usable =
        closestParents.find((r) => r.total_emissions !== null) ??
        closestParents[0];

      return {
        row: usable,
        matchType: "parent",
        ambiguous: false,
        candidates: closestParents,
      };
    }

    // Input is less specific than one or more stored TARIC/CN child keys.
    const children = rows.filter((r) => {
      const stored = String(r.cn_digits);
      return stored.length > cn.length && stored.startsWith(cn);
    });

    if (children.length) {
      const shortestLength = Math.min(
        ...children.map((r) => Number(r.cn_digits_length))
      );

      const closestChildren = children.filter(
        (r) => Number(r.cn_digits_length) === shortestLength
      );

      const usableChildren = closestChildren.filter(
        (r) => r.total_emissions !== null
      );

      const comparisonSet =
        usableChildren.length > 0
          ? usableChildren
          : closestChildren;

      // If all closest children represent the same numerical/route result,
      // using the first is harmless. Otherwise require a more-specific code.
      const signatures = new Set(
        comparisonSet.map((r) =>
          JSON.stringify({
            total:
              r.total_emissions === null
                ? null
                : Number(r.total_emissions),
            route: r.production_route_indicator ?? null,
            sector: r.sector ?? null,
          })
        )
      );

      if (signatures.size > 1) {
        return {
          row: null,
          matchType: "child",
          ambiguous: true,
          candidates: comparisonSet,
        };
      }

      return {
        row: comparisonSet[0],
        matchType: "child",
        ambiguous: false,
        candidates: comparisonSet,
      };
    }

    return {
      row: null,
      matchType: null,
      ambiguous: false,
      candidates: [],
    };
  };

  let resolution = chooseDefaultRow(countryRows);
  let defaultFallbackUsed = false;

  if (resolution.ambiguous) {
    return {
      found: false,
      ambiguous: true,
      reason:
        "This CN code maps to multiple more-specific official TARIC/CN default-value rows. Provide the more-specific code instead of allowing the calculator to guess.",
      cnCode: input.cnCode,
      normalizedCn: cn,
      country: input.country,
      reportingYear,
      productionYear: input.productionYear ?? null,
      regulatoryYear,
      mode,
      candidates: resolution.candidates.map(summarizeCandidate),
    };
  }

  if (!resolution.row || resolution.row.total_emissions === null) {
    const fallbackResolution = chooseDefaultRow(fallbackRows);

    if (fallbackResolution.ambiguous) {
      return {
        found: false,
        ambiguous: true,
        reason:
          'The "Other countries and territories" fallback contains multiple more-specific official rows for this code. Provide the more-specific CN/TARIC code.',
        cnCode: input.cnCode,
        normalizedCn: cn,
        country: input.country,
        reportingYear,
        productionYear: input.productionYear ?? null,
        regulatoryYear,
        mode,
        candidates:
          fallbackResolution.candidates.map(summarizeCandidate),
      };
    }

    if (fallbackResolution.row) {
      resolution = fallbackResolution;
      defaultFallbackUsed = true;
    }
  }

  const defaultRow = resolution.row;

  if (!defaultRow) {
    return {
      found: false,
      ambiguous: false,
      reason:
        "No official default-value record matched this CN/TARIC code and country.",
      cnCode: input.cnCode,
      normalizedCn: cn,
      country: input.country,
      reportingYear,
      productionYear: input.productionYear ?? null,
      regulatoryYear,
      mode,
    };
  }

  const sector = defaultRow.sector as CbamSector | null;
  const routeFromDefault =
    (defaultRow.production_route_indicator as string | null) ?? null;

  const requestedRoute =
    input.productionRouteIndicator?.toUpperCase() || null;

  const benchmarkRoute =
    mode === "default"
      ? routeFromDefault
      : requestedRoute || routeFromDefault;

  /**
   * 2) Resolve benchmark.
   *
   * Column B is used for default values.
   * Column A is the process-related benchmark used by the actual-data
   * methodology. Complex-good SEFA can require precursor calculations beyond
   * this simple resolver, so actual mode returns benchmark context rather than
   * claiming full compliance for every complex good.
   */
  const benchmarkKind = mode === "default" ? "default" : "actual";

  const benchmarkRows = await sql`
    SELECT *
    FROM cbam_official_benchmarks
    WHERE source_version = ${benchmarksVersion}
      AND benchmark_kind = ${benchmarkKind}
      AND (
        cn_digits = ${cn}
        OR ${cn} LIKE cn_digits || '%'
        OR cn_digits LIKE ${cn} || '%'
      )
      AND production_year_from <= ${regulatoryYear}
      AND production_year_to >= ${regulatoryYear}
      AND (
        ${benchmarkRoute}::text IS NULL
        OR production_route_indicator IS NULL
        OR production_route_indicator = ${benchmarkRoute}
      )
    ORDER BY
      CASE
        WHEN cn_digits = ${cn} THEN 0
        WHEN ${cn} LIKE cn_digits || '%' THEN 1
        WHEN cn_digits LIKE ${cn} || '%' THEN 2
        ELSE 3
      END ASC,
      ABS(cn_digits_length - ${cn.length}) ASC,
      CASE
        WHEN production_route_indicator = ${benchmarkRoute} THEN 0
        WHEN production_route_indicator IS NULL THEN 1
        ELSE 2
      END ASC,
      benchmark_value DESC
    LIMIT 30
  `;

  let benchmarkRow: any | null = null;
  let benchmarkRouteAmbiguous = false;
  let benchmarkRouteCandidates: string[] = [];

  if (benchmarkRows.length) {
    const matchRank = (row: any) => {
      const stored = String(row.cn_digits);
      if (stored === cn) return 0;
      if (cn.startsWith(stored)) return 1; // stored parent
      if (stored.startsWith(cn)) return 2; // stored child
      return 3;
    };

    const bestRank = Math.min(...benchmarkRows.map(matchRank));
    const bestRankRows = benchmarkRows.filter((row) => matchRank(row) === bestRank);
    const bestDistance = Math.min(
      ...bestRankRows.map((row) => Math.abs(Number(row.cn_digits_length) - cn.length))
    );
    const sameSpecificity = bestRankRows.filter(
      (row) => Math.abs(Number(row.cn_digits_length) - cn.length) === bestDistance
    );

    const routeSpecific = sameSpecificity.filter(
      (row) => row.production_route_indicator !== null
    );
    benchmarkRouteCandidates = Array.from(
      new Set<string>(
        routeSpecific.map((row: any) => String(row.production_route_indicator))
      )
    ).sort();

    if (benchmarkRoute) {
      const exactRoute = sameSpecificity
        .filter((row) => row.production_route_indicator === benchmarkRoute)
        .sort((a, b) => Number(b.benchmark_value) - Number(a.benchmark_value));
      const routeIndependent = sameSpecificity
        .filter((row) => row.production_route_indicator === null)
        .sort((a, b) => Number(b.benchmark_value) - Number(a.benchmark_value));
      benchmarkRow = exactRoute[0] ?? routeIndependent[0] ?? null;
    } else {
      const routeIndependent = sameSpecificity
        .filter((row) => row.production_route_indicator === null)
        .sort((a, b) => Number(b.benchmark_value) - Number(a.benchmark_value));

      if (routeIndependent.length) {
        benchmarkRow = routeIndependent[0];
      } else if (benchmarkRouteCandidates.length === 1) {
        benchmarkRow = routeSpecific
          .filter(
            (row) =>
              String(row.production_route_indicator) ===
              benchmarkRouteCandidates[0]
          )
          .sort((a, b) => Number(b.benchmark_value) - Number(a.benchmark_value))[0] ?? null;
      } else if (benchmarkRouteCandidates.length > 1) {
        // Never silently choose a production route. Different routes can carry
        // materially different benchmarks and therefore different SEFA.
        benchmarkRouteAmbiguous = true;
      }
    }
  }

  const rawTotal =
    defaultRow.total_emissions === null
      ? null
      : Number(defaultRow.total_emissions);

  const markup = defaultMarkupMultiplier(sector, regulatoryYear);

  const defaultSpecificEmbeddedEmissions =
    rawTotal !== null && markup !== null ? rawTotal * markup : null;

  const benchmark =
    benchmarkRow?.benchmark_value === undefined ||
    benchmarkRow?.benchmark_value === null
      ? null
      : Number(benchmarkRow.benchmark_value);

  const cbamFactor = freeAllocationFactorForYear(regulatoryYear);
  const cscf = cscfForYear(regulatoryYear);

  const simpleDefaultSefa =
    mode !== "default"
      ? null
      : cbamFactor === 0
        ? 0
        : benchmark !== null &&
            cbamFactor !== null &&
            cscf !== null
          ? benchmark * cbamFactor * cscf
          : null;

  return {
    found: true,
    cnCode: input.cnCode,
    normalizedCn: cn,
    country: input.country,
    reportingYear,
    productionYear: input.productionYear ?? null,
    regulatoryYear,
    activeReferenceVersions: {
      defaultValues: defaultsVersion,
      benchmarks: benchmarksVersion,
    },
    mode,

    defaultValue: {
      countryUsed: defaultRow.country,
      fallbackUsed: defaultFallbackUsed,
      cnMatchType: resolution.matchType,
      requestedCn: cn,
      matchedCn: String(defaultRow.cn_digits),
      matchedCnCode: defaultRow.cn_code,
      sector,
      description: defaultRow.description,
      directEmissions:
        defaultRow.direct_emissions === null
          ? null
          : Number(defaultRow.direct_emissions),
      indirectEmissions:
        defaultRow.indirect_emissions === null
          ? null
          : Number(defaultRow.indirect_emissions),
      totalEmissions: rawTotal,
      markupMultiplier: markup,
      markedUpTotalEmissions: defaultSpecificEmbeddedEmissions,
      productionRouteIndicator: routeFromDefault,
      productionRouteLabel: routeFromDefault
        ? ROUTE_LABELS[routeFromDefault] ?? null
        : null,
      sourceRegulation: defaultRow.source_regulation,
      sourceVersion: defaultRow.source_version,
      sourceUrl: defaultRow.source_url,
    },

    benchmark: benchmarkRow
      ? {
          kind: benchmarkKind,
          value: benchmark,
          productionRouteIndicator:
            benchmarkRow.production_route_indicator,
          productionRouteLabel:
            benchmarkRow.production_route_label,
          productionYearFrom: Number(
            benchmarkRow.production_year_from
          ),
          productionYearTo: Number(
            benchmarkRow.production_year_to
          ),
          sourceRegulation: benchmarkRow.source_regulation,
          sourceVersion: benchmarkRow.source_version,
          sourceUrl: benchmarkRow.source_url,
        }
      : null,

    benchmarkResolution: {
      routeRequested: benchmarkRoute,
      routeAmbiguous: benchmarkRouteAmbiguous,
      routeCandidates: benchmarkRouteCandidates,
    },

    simpleDefaultSefa,

    warnings: [
      ...(mode === "actual"
        ? [
            "Actual-data SEFA for complex goods can require process and precursor calculations; this endpoint only resolves the applicable process benchmark context.",
          ]
        : []),
      ...(benchmarkRouteAmbiguous
        ? [
            `Multiple production-route benchmarks are available (${benchmarkRouteCandidates.join(", ")}). Select the applicable production route instead of allowing the calculator to guess.`,
          ]
        : []),
      ...(benchmark === null && cbamFactor !== 0
        ? [
            "No benchmark was resolved. Do not calculate a final free-allocation adjustment until the benchmark selection is reviewed.",
          ]
        : []),
      ...(regulatoryYear > 2030 && cbamFactor !== 0
        ? [
            "CSCF is not hard-coded after 2030 in this resolver; future-year SEFA requires the applicable published CSCF.",
          ]
        : []),
    ],
  };
}
