import { cache } from "react";
import { neon } from "@neondatabase/serverless";
import { DIRECT_ONLY_SECTORS, type CbamCoreSector } from "@/lib/cbam-regulatory-calendar";

/**
 * Read-only access to the Commission default values already imported for the
 * calculator (table cbam_official_default_values). Used by the public
 * /cbam/country/[slug] and /cbam/cn/[code] pages.
 *
 * Error policy: a database failure THROWS, so an outage is never cached as a
 * "not found" page. Functions return null/[] only when a query succeeded and
 * found nothing.
 */

const FALLBACK_VERSION = "EU-default-values-corrected-2026-08-10";

export type DefaultRow = {
  country: string;
  countryNormalized: string;
  sector: string | null;
  cnCode: string;
  cnDigits: string;
  description: string | null;
  direct: number | null;
  indirect: number | null;
  total: number | null;
  routeIndicator: string | null;
  routeLabel: string | null;
};

export const SECTOR_LABELS: Record<string, string> = {
  cement: "Cement",
  iron_steel: "Iron and steel",
  aluminium: "Aluminium",
  fertiliser: "Fertilisers",
  hydrogen: "Hydrogen",
  electricity: "Electricity",
};

export const sectorLabel = (sector: string | null) => (sector ? SECTOR_LABELS[sector] ?? sector : "Other");

export const countrySlug = (normalized: string) => normalized.trim().replace(/\s+/g, "-");
export const slugToNormalized = (slug: string) => slug.trim().toLowerCase().replace(/-/g, " ");

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;

function client(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return neon(url) as unknown as Sql;
}

async function activeVersion(sql: Sql): Promise<string> {
  const rows = await sql`SELECT source_version FROM cbam_reference_active WHERE dataset_type = 'default_values' LIMIT 1`;
  return rows[0]?.source_version ? String(rows[0].source_version) : FALLBACK_VERSION;
}

const mapRow = (row: Record<string, unknown>): DefaultRow => ({
  country: String(row.country),
  countryNormalized: String(row.country_normalized),
  sector: row.sector ? String(row.sector) : null,
  cnCode: String(row.cn_code),
  cnDigits: String(row.cn_digits),
  description: row.description ? String(row.description) : null,
  direct: num(row.direct_emissions),
  indirect: num(row.indirect_emissions),
  total: num(row.total_emissions),
  routeIndicator: row.production_route_indicator ? String(row.production_route_indicator) : null,
  routeLabel: row.production_route_label ? String(row.production_route_label) : null,
});

/**
 * Emissions (tCO2e per tonne) that count towards the CBAM obligation:
 * direct only for sectors where indirect emissions are excluded, otherwise total.
 */
export function includedEmissions(row: Pick<DefaultRow, "sector" | "direct" | "indirect" | "total">): number | null {
  const directOnly = DIRECT_ONLY_SECTORS.has(row.sector as CbamCoreSector);
  if (directOnly) return row.direct;
  if (row.total !== null) return row.total;
  if (row.direct === null && row.indirect === null) return null;
  return (row.direct ?? 0) + (row.indirect ?? 0);
}

export type CountrySummary = { name: string; normalized: string; slug: string; goods: number };

export async function listCountries(): Promise<CountrySummary[]> {
  const sql = client();
  const version = await activeVersion(sql);
  const rows = await sql`
    SELECT country, country_normalized, COUNT(*)::integer AS goods
    FROM cbam_official_default_values
    WHERE source_version = ${version}
    GROUP BY country, country_normalized
    ORDER BY country ASC
  `;
  return rows.map((r) => ({ name: String(r.country), normalized: String(r.country_normalized), slug: countrySlug(String(r.country_normalized)), goods: Number(r.goods) }));
}

async function loadCountryRows(slug: string): Promise<{ version: string; rows: DefaultRow[] } | null> {
  const sql = client();
  const version = await activeVersion(sql);
  const normalized = slugToNormalized(slug);
  const rows = await sql`
    SELECT country, country_normalized, sector, cn_code, cn_digits, description,
           direct_emissions, indirect_emissions, total_emissions,
           production_route_indicator, production_route_label
    FROM cbam_official_default_values
    WHERE source_version = ${version} AND country_normalized = ${normalized}
    ORDER BY sector ASC NULLS LAST, cn_digits ASC, production_route_indicator ASC NULLS LAST
  `;
  if (!rows.length) return null;
  return { version, rows: rows.map(mapRow) };
}

async function loadCnRows(digits: string): Promise<{ version: string; rows: DefaultRow[] } | null> {
  if (!/^\d{4,10}$/.test(digits)) return null;
  const sql = client();
  const version = await activeVersion(sql);
  const rows = await sql`
    SELECT country, country_normalized, sector, cn_code, cn_digits, description,
           direct_emissions, indirect_emissions, total_emissions,
           production_route_indicator, production_route_label
    FROM cbam_official_default_values
    WHERE source_version = ${version} AND cn_digits = ${digits}
    ORDER BY country ASC, production_route_indicator ASC NULLS LAST
  `;
  if (!rows.length) return null;
  return { version, rows: rows.map(mapRow) };
}

/** Per-request memoised so generateMetadata and the page body share one query. */
export const getCountryRows = cache(loadCountryRows);
export const getCnRows = cache(loadCnRows);

export type CnSummary = { digits: string; cnCode: string; sector: string | null; description: string | null; countries: number };

export async function listCnCodes(): Promise<CnSummary[]> {
  const sql = client();
  const version = await activeVersion(sql);
  const rows = await sql`
    SELECT cn_digits, MIN(cn_code) AS cn_code, MIN(sector) AS sector, MIN(description) AS description,
           COUNT(DISTINCT country_normalized)::integer AS countries
    FROM cbam_official_default_values
    WHERE source_version = ${version}
    GROUP BY cn_digits
    ORDER BY cn_digits ASC
  `;
  return rows.map((r) => ({
    digits: String(r.cn_digits),
    cnCode: String(r.cn_code),
    sector: r.sector ? String(r.sector) : null,
    description: r.description ? String(r.description) : null,
    countries: Number(r.countries),
  }));
}

/** Never throws; used at build time so an unreachable database just means fewer pre-rendered pages. */
export async function safely<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error("CBAM public reference unavailable:", error instanceof Error ? error.message : error);
    return fallback;
  }
}

// ---------- pure helpers (unit-testable without a database) ----------

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export type SectorStat = { sector: string | null; label: string; codes: number; min: number | null; median: number | null; max: number | null };

export function sectorStats(rows: DefaultRow[]): SectorStat[] {
  const groups = new Map<string, DefaultRow[]>();
  for (const row of rows) {
    const key = row.sector ?? "other";
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      const values = list.map(includedEmissions).filter((v): v is number => v !== null);
      return {
        sector: key === "other" ? null : key,
        label: sectorLabel(key === "other" ? null : key),
        codes: new Set(list.map((r) => r.cnDigits)).size,
        min: values.length ? Math.min(...values) : null,
        median: median(values),
        max: values.length ? Math.max(...values) : null,
      };
    })
    .sort((a, b) => b.codes - a.codes);
}
