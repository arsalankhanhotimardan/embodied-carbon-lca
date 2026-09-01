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

  const cn = normalized.findIndex((v) => v.includes("cn code"));
  const description = normalized.findIndex((v) => v.includes("description"));
  const colA = normalized.findIndex((v) => v.includes("column a"));
  const colB = normalized.findIndex((v) => v.includes("column b"));

  if (cn < 0 || colA < 0 || colB < 0) return null;

  return { cn, description, colA, colB };
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

const parseBenchmarkCell = (value) => {
  const raw = clean(value);
  if (!raw) return [];

  // Examples:
  // "0,666"
  // "0,666 (A) 0,859 (B)"
  // "0,717 (1) 0,686 (2)"
  // "1,673 (F)(1) 0,815 (G)(1) ... "
  const tokenRegex =
    /(-?\d+(?:[.,]\d+)?)(?:\s*\(([A-HJKL])\))?(?:\s*\(([12])\))?/gi;

  const tokens = [];
  let match;

  while ((match = tokenRegex.exec(raw)) !== null) {
    const valueNumber = Number(match[1].replace(",", "."));
    if (!Number.isFinite(valueNumber)) continue;

    const route = match[2] ? match[2].toUpperCase() : null;
    const yearMarker = match[3] || null;

    tokens.push({
      value: valueNumber,
      routeIndicator: route,
      routeLabel: route ? ROUTES[route] || null : null,
      productionYearFrom: yearMarker === "2" ? 2028 : 2026,
      productionYearTo: yearMarker === "1" ? 2027 : 2030,
      rawCell: raw,
    });
  }

  return tokens;
};

const parseBenchmarkWorkbook = (buffer) => {
  const wb = readWorkbook(buffer);
  const records = [];

  for (const sheetName of wb.SheetNames) {
    const rows = rowsForSheet(wb, sheetName);
    let currentSector = null;
    let header = null;

    for (let i = 0; i < rows.length; i += 1) {
      const row = Array.isArray(rows[i]) ? rows[i] : [];
      const cells = row.map(clean);
      const nonEmpty = cells.filter(Boolean);

      if (!nonEmpty.length) continue;

      const detectedHeader = detectBenchmarkHeader(row);
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

      if (!header) continue;

      const rawCn = cells[header.cn] || "";
      const digits = cnDigits(rawCn);
      if (digits.length < 4) continue;

      const description =
        header.description >= 0 ? cells[header.description] || null : null;

      const actualTokens = parseBenchmarkCell(cells[header.colA]);
      const defaultTokens = parseBenchmarkCell(cells[header.colB]);

      for (const token of actualTokens) {
        records.push({
          sourceSheet: sheetName,
          sourceRow: i + 1,
          sector: currentSector,
          cnCode: rawCn,
          cnDigits: digits,
          description,
          benchmarkKind: "actual",
          ...token,
          rawData: { row: cells },
        });
      }

      for (const token of defaultTokens) {
        records.push({
          sourceSheet: sheetName,
          sourceRow: i + 1,
          sector: currentSector,
          cnCode: rawCn,
          cnDigits: digits,
          description,
          benchmarkKind: "default",
          ...token,
          rawData: { row: cells },
        });
      }
    }
  }

  return records;
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

const insertInChunks = async (rows, chunkSize, fn) => {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    for (const row of chunk) {
      await fn(row);
    }
    console.log(`  inserted ${Math.min(i + chunk.length, rows.length)}/${rows.length}`);
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

  const summary = summarize(defaultRows, benchmarkRows);

  console.log("\nParsed summary:");
  console.log(JSON.stringify(summary, null, 2));

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

  console.log("Inserting default values...");
  await insertInChunks(defaultRows, 500, async (row) => {
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
      VALUES (
        ${DEFAULTS_VERSION},
        ${DEFAULTS_REGULATION},
        ${DEFAULTS_URL},
        ${row.sourceSheet},
        ${row.sourceRow},
        ${row.country},
        ${row.countryNormalized},
        ${row.sector},
        ${row.cnCode},
        ${row.cnDigits},
        ${row.cnDigits.length},
        ${row.description},
        ${row.directEmissions},
        ${row.indirectEmissions},
        ${row.totalEmissions},
        ${row.productionRouteIndicator},
        ${row.productionRouteLabel},
        ${JSON.stringify(row.rawData)}::jsonb
      )
    `;
  });

  console.log("Inserting benchmarks...");
  await insertInChunks(benchmarkRows, 500, async (row) => {
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
      VALUES (
        ${BENCHMARKS_VERSION},
        ${BENCHMARKS_REGULATION},
        ${BENCHMARKS_URL},
        ${row.sourceSheet},
        ${row.sourceRow},
        ${row.sector},
        ${row.cnCode},
        ${row.cnDigits},
        ${row.cnDigits.length},
        ${row.description},
        ${row.benchmarkKind},
        ${row.value},
        ${row.routeIndicator},
        ${row.routeLabel},
        ${row.productionYearFrom},
        ${row.productionYearTo},
        ${row.rawCell},
        ${JSON.stringify(row.rawData)}::jsonb
      )
    `;
  });

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
