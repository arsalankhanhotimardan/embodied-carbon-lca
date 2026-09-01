#!/usr/bin/env node

/**
 * Import the European Commission's official CBAM definitive-period
 * default-value and benchmark XLSX files into Neon.
 *
 * Requirements:
 *   npm install xlsx
 *
 * Run:
 *   node --env-file=.env.local scripts/import-cbam-official-data.mjs --dry-run
 *   node --env-file=.env.local scripts/import-cbam-official-data.mjs
 *
 * Optional local-file mode:
 *   node --env-file=.env.local scripts/import-cbam-official-data.mjs \
 *     --defaults-file ./data/cbam-default-values.xlsx \
 *     --benchmarks-file ./data/cbam-benchmarks.xlsx
 *
 * The importer:
 * - downloads from Commission URLs unless local files are supplied;
 * - computes SHA-256 for traceability;
 * - parses every worksheet using header discovery, not fixed row numbers;
 * - stores raw source context;
 * - replaces only the same source_version, never your cbam_products catalog;
 * - never invents missing emissions or benchmark values.
 */

import fs from "node:fs/promises";
import crypto from "node:crypto";
import process from "node:process";
import * as XLSX from "xlsx";
import { neon } from "@neondatabase/serverless";

const DEFAULTS_URL =
  "https://taxation-customs.ec.europa.eu/document/download/1c05d211-80cb-4aaa-8ef0-e08005a95d7e_en?filename=DV+correcting+act_final+update_06.08.xlsx";

const BENCHMARKS_URL =
  "https://taxation-customs.ec.europa.eu/document/download/9877523c-2a02-4926-a211-aefae7cf6d0d_en?filename=CBAM+Benchmarks_20260206.xlsx";

const DEFAULTS_VERSION = "EU-default-values-corrected-2026-08-10";
const BENCHMARKS_VERSION = "EU-benchmarks-2026-02-13";

const DEFAULTS_REGULATION =
  "Implementing Regulation (EU) 2025/2621 corrected by (EU) 2026/1740";
const BENCHMARKS_REGULATION =
  "Implementing Regulation (EU) 2025/2620";

const ROUTES = {
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

const SECTORS = new Map([
  ["cement", "cement"],
  ["fertilisers", "fertiliser"],
  ["fertilizers", "fertiliser"],
  ["fertiliser", "fertiliser"],
  ["fertilizer", "fertiliser"],
  ["iron and steel", "iron_steel"],
  ["iron & steel", "iron_steel"],
  ["iron / steel", "iron_steel"],
  ["aluminium", "aluminium"],
  ["aluminum", "aluminium"],
  ["hydrogen", "hydrogen"],
  ["electricity", "electricity"],
]);

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const token = process.argv[i];
  if (!token.startsWith("--")) continue;
  const next = process.argv[i + 1];
  if (next && !next.startsWith("--")) {
    args.set(token, next);
    i += 1;
  } else {
    args.set(token, true);
  }
}

const dryRun = args.has("--dry-run");
const defaultsFile = args.get("--defaults-file");
const benchmarksFile = args.get("--benchmarks-file");

const clean = (value) =>
  value === null || value === undefined
    ? ""
    : String(value)
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const normalizeHeading = (value) =>
  clean(value).toLowerCase().replace(/[–—]/g, "-");

const normalizeCountry = (value) =>
  normalizeHeading(value)
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const cnDigits = (value) => clean(value).replace(/\D/g, "");

const parseNumber = (value) => {
  const str = clean(value);
  if (!str || str === "-" || str === "–" || /^n\/?a$/i.test(str)) return null;
  if (/see below/i.test(str)) return null;

  const match = str
    .replace(/\s/g, "")
    .replace(",", ".")
    .match(/-?\d+(?:\.\d+)?/);

  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
};

const routeIndicatorFromText = (value) => {
  const str = clean(value);
  const match = str.match(/\(([A-HJKL])\)/i);
  return match ? match[1].toUpperCase() : null;
};

const sectorFromText = (value) => {
  const normalized = normalizeHeading(value).replace(/:$/, "");
  if (SECTORS.has(normalized)) return SECTORS.get(normalized);

  for (const [needle, sector] of SECTORS.entries()) {
    if (normalized === needle || normalized.startsWith(`${needle} `)) {
      return sector;
    }
  }

  return null;
};

const isLikelyCountryHeading = (row) => {
  const cells = row.map(clean).filter(Boolean);
  if (cells.length !== 1) return false;

  const value = cells[0];
  const lower = normalizeHeading(value);

  if (sectorFromText(value)) return false;
  if (/\bannex\b/.test(lower)) return false;
  if (/default values/.test(lower)) return false;
  if (/benchmark/.test(lower)) return false;
  if (/product cn code/.test(lower)) return false;
  if (/cn code/.test(lower)) return false;
  if (/description/.test(lower)) return false;
  if (/tco2/.test(lower)) return false;
  if (/direct emissions/.test(lower)) return false;
  if (/indirect emissions/.test(lower)) return false;
  if (/total emissions/.test(lower)) return false;
  if (/underlying production route/.test(lower)) return false;
  if (/^\d/.test(lower)) return false;

  return value.length <= 120;
};

const findHeaderIndex = (row, tests) => {
  const normalized = row.map((v) => normalizeHeading(v));
  return normalized.findIndex((v) => tests.some((test) => test(v)));
};

const detectDefaultHeader = (row) => {
  const joined = row.map(normalizeHeading).join(" | ");
  if (!joined.includes("default value")) return null;
  if (!joined.includes("total emissions")) return null;

  const cn = findHeaderIndex(row, [
    (v) => v.includes("product cn code"),
    (v) => v.includes("cn code"),
    (v) => v.includes("taric code"),
  ]);
  const description = findHeaderIndex(row, [(v) => v.includes("description")]);
  const direct = findHeaderIndex(row, [
    (v) => v.includes("direct emissions"),
  ]);
  const indirect = findHeaderIndex(row, [
    (v) => v.includes("indirect emissions"),
  ]);
  const total = findHeaderIndex(row, [(v) => v.includes("total emissions")]);
  const route = findHeaderIndex(row, [
    (v) => v.includes("production route"),
  ]);

  if (cn < 0 || total < 0) return null;

  return { cn, description, direct, indirect, total, route };
};

const detectBenchmarkHeader = (row) => {
  const normalized = row.map(normalizeHeading);
  const joined = normalized.join(" | ");

  if (!joined.includes("cn code")) return null;
  if (!joined.includes("column a")) return null;
  if (!joined.includes("column b")) return null;

  const cn = normalized.findIndex((v) => v === "cn code" || v.includes("cn code"));
  const description = normalized.findIndex((v) => v.includes("description"));

  // The official workbook uses separate value and indicator columns:
  // [2] Column A BMg*
  // [3] Column A Production route indicator
  // [4] Column B BMg
  // [5] Column B Production route indicator
  const colA = normalized.findIndex(
    (v) => v.includes("column a") && !v.includes("production route indicator")
  );
  const colAIndicator = normalized.findIndex(
    (v) => v.includes("column a") && v.includes("production route indicator")
  );
  const colB = normalized.findIndex(
    (v) => v.includes("column b") && !v.includes("production route indicator")
  );
  const colBIndicator = normalized.findIndex(
    (v) => v.includes("column b") && v.includes("production route indicator")
  );

  if (cn < 0 || colA < 0 || colB < 0) return null;

  return {
    cn,
    description,
    colA,
    colAIndicator,
    colB,
    colBIndicator,
  };
};

const readWorkbook = (buffer) =>
  XLSX.read(buffer, {
    type: "buffer",
    raw: false,
    cellDates: false,
  });

const rowsForSheet = (workbook, sheetName) =>
  XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: "",
    blankrows: true,
  });

const parseDefaultWorkbook = (buffer) => {
  const wb = readWorkbook(buffer);
  const records = [];

  for (const sheetName of wb.SheetNames) {
    const rows = rowsForSheet(wb, sheetName);
    let currentCountry = null;
    let currentSector = null;
    let header = null;

    for (let i = 0; i < rows.length; i += 1) {
      const row = Array.isArray(rows[i]) ? rows[i] : [];
      const cells = row.map(clean);
      const nonEmpty = cells.filter(Boolean);

      if (!nonEmpty.length) continue;

      const detectedHeader = detectDefaultHeader(row);
      if (detectedHeader) {
        header = detectedHeader;
        continue;
      }

      const first = nonEmpty[0];
      const sector = sectorFromText(first);

      if (sector && nonEmpty.length <= 2) {
        currentSector = sector;
        continue;
      }

      if (isLikelyCountryHeading(row)) {
        currentCountry = first;
        header = null;
        continue;
      }

      if (!header || !currentCountry) continue;

      const rawCn = cells[header.cn] || "";
      const digits = cnDigits(rawCn);

      // Valid goods rows have at least a 4-digit CN/HS/TARIC key.
      if (digits.length < 4) {
        // Sector headings can also appear inside the table.
        const inlineSector = sectorFromText(rawCn);
        if (inlineSector) currentSector = inlineSector;
        continue;
      }

      const direct =
        header.direct >= 0 ? parseNumber(cells[header.direct]) : null;
      const indirect =
        header.indirect >= 0 ? parseNumber(cells[header.indirect]) : null;
      const total = parseNumber(cells[header.total]);

      // "see below" headings and rows with no usable values are retained only
      // if a route exists. Otherwise they are section/group headings.
      const routeText = header.route >= 0 ? cells[header.route] : "";
      const routeIndicator = routeIndicatorFromText(routeText);

      if (
        direct === null &&
        indirect === null &&
        total === null &&
        !routeIndicator
      ) {
        continue;
      }

      records.push({
        sourceSheet: sheetName,
        sourceRow: i + 1,
        country: currentCountry,
        countryNormalized: normalizeCountry(currentCountry),
        sector: currentSector,
        cnCode: rawCn,
        cnDigits: digits,
        description:
          header.description >= 0 ? cells[header.description] || null : null,
        directEmissions: direct,
        indirectEmissions: indirect,
        totalEmissions: total,
        productionRouteIndicator: routeIndicator,
        productionRouteLabel: routeIndicator
          ? ROUTES[routeIndicator] || null
          : null,
        rawData: {
          row: cells,
          routeText: routeText || null,
        },
      });
    }
  }

  return records;
};

const parseBenchmarkIndicator = (valueCell, indicatorCell) => {
  const combined = `${clean(valueCell)} ${clean(indicatorCell)}`.trim();

  const routeMatch = combined.match(/\(([A-HJKL])\)/i);
  const yearMatch = combined.match(/\(([12])\)/);

  const routeIndicator = routeMatch
    ? routeMatch[1].toUpperCase()
    : null;

  const yearMarker = yearMatch ? yearMatch[1] : null;

  return {
    routeIndicator,
    routeLabel: routeIndicator
      ? ROUTES[routeIndicator] || null
      : null,
    productionYearFrom: yearMarker === "2" ? 2028 : 2026,
    productionYearTo: yearMarker === "1" ? 2027 : 2030,
    rawIndicator: clean(indicatorCell) || null,
  };
};

const parseBenchmarkValue = (valueCell, indicatorCell) => {
  const value = parseNumber(valueCell);
  if (value === null) return null;

  const indicator = parseBenchmarkIndicator(valueCell, indicatorCell);

  return {
    value,
    ...indicator,
    rawCell: clean(valueCell),
  };
};

const parseBenchmarkWorkbook = (buffer) => {
  const wb = readWorkbook(buffer);
  const records = [];

  for (const sheetName of wb.SheetNames) {
    const rows = rowsForSheet(wb, sheetName);

    let currentSector = null;
    let header = null;

    // The official benchmark workbook uses continuation rows. For example:
    //
    // 25231000 | Cement clinkers | 0.666 | (A) | 0.666 | (A)
    //          |                 | 0.859 | (B) | 0.859 | (B)
    //
    // Therefore CN code and description must be inherited from the previous
    // physical row until a new CN code or sector heading appears.
    let currentCnCode = null;
    let currentCnDigits = null;
    let currentDescription = null;

    for (let i = 0; i < rows.length; i += 1) {
      const row = Array.isArray(rows[i]) ? rows[i] : [];
      const cells = row.map(clean);
      const nonEmpty = cells.filter(Boolean);

      if (!nonEmpty.length) continue;

      const detectedHeader = detectBenchmarkHeader(row);
      if (detectedHeader) {
        header = detectedHeader;
        currentCnCode = null;
        currentCnDigits = null;
        currentDescription = null;
        continue;
      }

      const first = nonEmpty[0];
      const sector = sectorFromText(first);

      if (sector && nonEmpty.length <= 2) {
        currentSector = sector;
        currentCnCode = null;
        currentCnDigits = null;
        currentDescription = null;
        continue;
      }

      if (!header) continue;

      const rawCn = cells[header.cn] || "";
      const digits = cnDigits(rawCn);

      // A non-blank CN cell starts a new goods record.
      if (digits.length >= 4) {
        currentCnCode = rawCn;
        currentCnDigits = digits;

        const description =
          header.description >= 0
            ? cells[header.description] || null
            : null;

        if (description) {
          currentDescription = description;
        }
      } else if (rawCn) {
        // A non-empty non-CN value in the first column is not a continuation
        // benchmark row. Ignore it safely.
        continue;
      }

      // Blank CN means this may be a continuation row such as the (B)
      // clinker route or the (2) production-year value.
      if (!currentCnCode || !currentCnDigits) continue;

      const description =
        header.description >= 0 && cells[header.description]
          ? cells[header.description]
          : currentDescription;

      const actual = parseBenchmarkValue(
        cells[header.colA],
        header.colAIndicator >= 0
          ? cells[header.colAIndicator]
          : ""
      );

      const defaultBenchmark = parseBenchmarkValue(
        cells[header.colB],
        header.colBIndicator >= 0
          ? cells[header.colBIndicator]
          : ""
      );

      if (actual) {
        records.push({
          sourceSheet: sheetName,
          sourceRow: i + 1,
          sector: currentSector,
          cnCode: currentCnCode,
          cnDigits: currentCnDigits,
          description,
          benchmarkKind: "actual",
          value: actual.value,
          routeIndicator: actual.routeIndicator,
          routeLabel: actual.routeLabel,
          productionYearFrom: actual.productionYearFrom,
          productionYearTo: actual.productionYearTo,
          rawCell: actual.rawCell,
          rawData: {
            row: cells,
            indicator: actual.rawIndicator,
          },
        });
      }

      if (defaultBenchmark) {
        records.push({
          sourceSheet: sheetName,
          sourceRow: i + 1,
          sector: currentSector,
          cnCode: currentCnCode,
          cnDigits: currentCnDigits,
          description,
          benchmarkKind: "default",
          value: defaultBenchmark.value,
          routeIndicator: defaultBenchmark.routeIndicator,
          routeLabel: defaultBenchmark.routeLabel,
          productionYearFrom: defaultBenchmark.productionYearFrom,
          productionYearTo: defaultBenchmark.productionYearTo,
          rawCell: defaultBenchmark.rawCell,
          rawData: {
            row: cells,
            indicator: defaultBenchmark.rawIndicator,
          },
        });
      }
    }
  }

  return records;
};

const validateBenchmarkParse = (records) => {
  const match = ({
    cn,
    kind,
    route = null,
    from,
    to,
    value,
  }) =>
    records.some(
      (r) =>
        r.cnDigits === cn &&
        r.benchmarkKind === kind &&
        r.routeIndicator === route &&
        r.productionYearFrom === from &&
        r.productionYearTo === to &&
        Math.abs(r.value - value) < 1e-9
    );

  const required = [
    // Cement clinker route variants
    {
      cn: "25231000",
      kind: "actual",
      route: "A",
      from: 2026,
      to: 2030,
      value: 0.666,
      label: "25231000 actual route A",
    },
    {
      cn: "25231000",
      kind: "actual",
      route: "B",
      from: 2026,
      to: 2030,
      value: 0.859,
      label: "25231000 actual route B",
    },
    {
      cn: "25231000",
      kind: "default",
      route: "A",
      from: 2026,
      to: 2030,
      value: 0.666,
      label: "25231000 default route A",
    },
    {
      cn: "25231000",
      kind: "default",
      route: "B",
      from: 2026,
      to: 2030,
      value: 0.859,
      label: "25231000 default route B",
    },

    // Aluminous cement production-year variants
    {
      cn: "25233000",
      kind: "actual",
      route: null,
      from: 2026,
      to: 2027,
      value: 0.717,
      label: "25233000 actual years 2026-27",
    },
    {
      cn: "25233000",
      kind: "actual",
      route: null,
      from: 2028,
      to: 2030,
      value: 0.686,
      label: "25233000 actual years 2028-30",
    },
    {
      cn: "25233000",
      kind: "default",
      route: null,
      from: 2026,
      to: 2027,
      value: 0.717,
      label: "25233000 default years 2026-27",
    },
    {
      cn: "25233000",
      kind: "default",
      route: null,
      from: 2028,
      to: 2030,
      value: 0.686,
      label: "25233000 default years 2028-30",
    },

    // Other hydraulic cements route variants
    {
      cn: "25239000",
      kind: "default",
      route: "A",
      from: 2026,
      to: 2030,
      value: 0.666,
      label: "25239000 default route A",
    },
    {
      cn: "25239000",
      kind: "default",
      route: "B",
      from: 2026,
      to: 2030,
      value: 0.847,
      label: "25239000 default route B",
    },
  ];

  const missing = required.filter((item) => !match(item));

  if (missing.length) {
    throw new Error(
      "Benchmark parser validation failed. Missing official benchmark variants:\n" +
        missing.map((item) => ` - ${item.label}`).join("\n")
    );
  }

  const routeCounts = {};
  const yearVariantCounts = {
    "2026-2027": 0,
    "2028-2030": 0,
    "2026-2030": 0,
  };

  for (const row of records) {
    if (row.routeIndicator) {
      routeCounts[row.routeIndicator] =
        (routeCounts[row.routeIndicator] || 0) + 1;
    }

    const key = `${row.productionYearFrom}-${row.productionYearTo}`;
    if (key in yearVariantCounts) {
      yearVariantCounts[key] += 1;
    }
  }

  return {
    validated: true,
    routeCounts,
    yearVariantCounts,
  };
};

const sha256 = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

const loadBuffer = async (localFile, url, label) => {
  if (localFile) {
    const buffer = await fs.readFile(localFile);
    console.log(`[${label}] loaded local file: ${localFile}`);
    return {
      buffer,
      sourceUrl: url,
      sourceFilename: localFile,
    };
  }

  console.log(`[${label}] downloading official Commission workbook...`);
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "GreenEngineeringTools-CBAM-ReferenceImporter/1.0 (+https://greenengineeringtools.com)",
      Accept:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(
      `${label} download failed with HTTP ${response.status}. ` +
        `Download the workbook manually from the Commission CBAM legislation page and rerun with --${label === "defaults" ? "defaults" : "benchmarks"}-file.`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    sourceUrl: url,
    sourceFilename: new URL(url).searchParams.get("filename") || null,
  };
};

const summarize = (defaults, benchmarks) => {
  const countries = new Set(defaults.map((r) => r.countryNormalized));
  const defaultSectors = {};
  const benchmarkSectors = {};

  for (const row of defaults) {
    const key = row.sector || "unknown";
    defaultSectors[key] = (defaultSectors[key] || 0) + 1;
  }

  for (const row of benchmarks) {
    const key = row.sector || "unknown";
    benchmarkSectors[key] = (benchmarkSectors[key] || 0) + 1;
  }

  return {
    defaultRows: defaults.length,
    benchmarkRows: benchmarks.length,
    countries: countries.size,
    defaultSectors,
    benchmarkSectors,
  };
};

const chunked = (rows, size = 500) => {
  const chunks = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
};

const insertDefaultRowsBulk = async (sql, rows) => {
  let inserted = 0;

  for (const chunk of chunked(rows, 500)) {
    const payload = chunk.map((row) => ({
      source_sheet: row.sourceSheet,
      source_row: row.sourceRow,
      country: row.country,
      country_normalized: row.countryNormalized,
      sector: row.sector,
      cn_code: row.cnCode,
      cn_digits: row.cnDigits,
      cn_digits_length: row.cnDigits.length,
      description: row.description,
      direct_emissions: row.directEmissions,
      indirect_emissions: row.indirectEmissions,
      total_emissions: row.totalEmissions,
      production_route_indicator: row.productionRouteIndicator,
      production_route_label: row.productionRouteLabel,
      raw_data: row.rawData,
    }));

    await sql`
      INSERT INTO cbam_official_default_values (
        source_version,
        source_regulation,
        source_url,
        source_sheet,
        source_row,
        country,
        country_normalized,
        sector,
        cn_code,
        cn_digits,
        cn_digits_length,
        description,
        direct_emissions,
        indirect_emissions,
        total_emissions,
        production_route_indicator,
        production_route_label,
        raw_data
      )
      SELECT
        ${DEFAULTS_VERSION},
        ${DEFAULTS_REGULATION},
        ${DEFAULTS_URL},
        x.source_sheet,
        x.source_row,
        x.country,
        x.country_normalized,
        x.sector,
        x.cn_code,
        x.cn_digits,
        x.cn_digits_length,
        x.description,
        x.direct_emissions,
        x.indirect_emissions,
        x.total_emissions,
        x.production_route_indicator,
        x.production_route_label,
        x.raw_data
      FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS x(
        source_sheet text,
        source_row integer,
        country text,
        country_normalized text,
        sector text,
        cn_code text,
        cn_digits text,
        cn_digits_length integer,
        description text,
        direct_emissions double precision,
        indirect_emissions double precision,
        total_emissions double precision,
        production_route_indicator text,
        production_route_label text,
        raw_data jsonb
      )
    `;

    inserted += chunk.length;
    console.log(`  default rows: ${inserted}/${rows.length}`);
  }
};

const insertBenchmarkRowsBulk = async (sql, rows) => {
  let inserted = 0;

  for (const chunk of chunked(rows, 500)) {
    const payload = chunk.map((row) => ({
      source_sheet: row.sourceSheet,
      source_row: row.sourceRow,
      sector: row.sector,
      cn_code: row.cnCode,
      cn_digits: row.cnDigits,
      cn_digits_length: row.cnDigits.length,
      description: row.description,
      benchmark_kind: row.benchmarkKind,
      benchmark_value: row.value,
      production_route_indicator: row.routeIndicator,
      production_route_label: row.routeLabel,
      production_year_from: row.productionYearFrom,
      production_year_to: row.productionYearTo,
      raw_cell: row.rawCell,
      raw_data: row.rawData,
    }));

    await sql`
      INSERT INTO cbam_official_benchmarks (
        source_version,
        source_regulation,
        source_url,
        source_sheet,
        source_row,
        sector,
        cn_code,
        cn_digits,
        cn_digits_length,
        description,
        benchmark_kind,
        benchmark_value,
        production_route_indicator,
        production_route_label,
        production_year_from,
        production_year_to,
        raw_cell,
        raw_data
      )
      SELECT
        ${BENCHMARKS_VERSION},
        ${BENCHMARKS_REGULATION},
        ${BENCHMARKS_URL},
        x.source_sheet,
        x.source_row,
        x.sector,
        x.cn_code,
        x.cn_digits,
        x.cn_digits_length,
        x.description,
        x.benchmark_kind,
        x.benchmark_value,
        x.production_route_indicator,
        x.production_route_label,
        x.production_year_from,
        x.production_year_to,
        x.raw_cell,
        x.raw_data
      FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS x(
        source_sheet text,
        source_row integer,
        sector text,
        cn_code text,
        cn_digits text,
        cn_digits_length integer,
        description text,
        benchmark_kind text,
        benchmark_value double precision,
        production_route_indicator text,
        production_route_label text,
        production_year_from integer,
        production_year_to integer,
        raw_cell text,
        raw_data jsonb
      )
    `;

    inserted += chunk.length;
    console.log(`  benchmark rows: ${inserted}/${rows.length}`);
  }
};

const main = async () => {
  const defaultsSource = await loadBuffer(
    defaultsFile,
    DEFAULTS_URL,
    "defaults"
  );
  const benchmarksSource = await loadBuffer(
    benchmarksFile,
    BENCHMARKS_URL,
    "benchmarks"
  );

  const defaultRows = parseDefaultWorkbook(defaultsSource.buffer);
  const benchmarkRows = parseBenchmarkWorkbook(benchmarksSource.buffer);

  const benchmarkValidation = validateBenchmarkParse(benchmarkRows);
  const summary = summarize(defaultRows, benchmarkRows);

  console.log("\nParsed summary:");
  console.log(JSON.stringify(summary, null, 2));

  console.log("\nBenchmark parser validation:");
  console.log(JSON.stringify(benchmarkValidation, null, 2));

  if (defaultRows.length < 50) {
    throw new Error(
      `Default parser found only ${defaultRows.length} rows. Stopping before database write.`
    );
  }

  if (benchmarkRows.length < 50) {
    throw new Error(
      `Benchmark parser found only ${benchmarkRows.length} rows. Stopping before database write.`
    );
  }

  const defaultHash = sha256(defaultsSource.buffer);
  const benchmarkHash = sha256(benchmarksSource.buffer);

  console.log("\nSource hashes:");
  console.log(`defaults   ${defaultHash}`);
  console.log(`benchmarks ${benchmarkHash}`);

  if (dryRun) {
    console.log("\nDRY RUN: no database changes made.");
    console.log("\nSample default rows:");
    console.log(defaultRows.slice(0, 5));
    console.log("\nSample benchmark rows:");
    console.log(benchmarkRows.slice(0, 8));

    console.log("\nBenchmark check — CN 25231000:");
    console.log(
      benchmarkRows.filter((r) => r.cnDigits === "25231000")
    );

    console.log("\nBenchmark check — CN 25233000:");
    console.log(
      benchmarkRows.filter((r) => r.cnDigits === "25233000")
    );

    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log("\nReplacing current official reference versions...");

  await sql`
    DELETE FROM cbam_official_default_values
    WHERE source_version = ${DEFAULTS_VERSION}
  `;

  await sql`
    DELETE FROM cbam_official_benchmarks
    WHERE source_version = ${BENCHMARKS_VERSION}
  `;

  console.log("Inserting default values in bulk...");
  await insertDefaultRowsBulk(sql, defaultRows);

  console.log("Inserting benchmarks in bulk...");
  await insertBenchmarkRowsBulk(sql, benchmarkRows);

  await sql`
    INSERT INTO cbam_reference_imports (
      dataset_type,
      source_version,
      source_url,
      source_filename,
      sha256,
      row_count,
      metadata
    )
    VALUES (
      'default_values',
      ${DEFAULTS_VERSION},
      ${DEFAULTS_URL},
      ${defaultsSource.sourceFilename},
      ${defaultHash},
      ${defaultRows.length},
      ${JSON.stringify(summary)}::jsonb
    )
    ON CONFLICT (dataset_type, source_version, sha256)
    DO UPDATE SET
      imported_at = NOW(),
      row_count = EXCLUDED.row_count,
      metadata = EXCLUDED.metadata
  `;

  await sql`
    INSERT INTO cbam_reference_imports (
      dataset_type,
      source_version,
      source_url,
      source_filename,
      sha256,
      row_count,
      metadata
    )
    VALUES (
      'benchmarks',
      ${BENCHMARKS_VERSION},
      ${BENCHMARKS_URL},
      ${benchmarksSource.sourceFilename},
      ${benchmarkHash},
      ${benchmarkRows.length},
      ${JSON.stringify(summary)}::jsonb
    )
    ON CONFLICT (dataset_type, source_version, sha256)
    DO UPDATE SET
      imported_at = NOW(),
      row_count = EXCLUDED.row_count,
      metadata = EXCLUDED.metadata
  `;

  console.log("\nImport complete.");
  console.log(summary);
};

main().catch((error) => {
  console.error("\nCBAM reference import failed:");
  console.error(error);
  process.exitCode = 1;
});
