// @ts-nocheck
import crypto from "node:crypto";
import * as XLSX from "xlsx";
import { neon } from "@neondatabase/serverless";

const GUIDANCE_PAGE =
  "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism/cbam-legislation-and-guidance_en";
const PARSER_VERSION = "cbam-reference-sync-v5";

const CURRENT_DEFAULT_HASH =
  "900583811c7e1194799eb9bdbad2d6d7e1100f5a7d80a664c1584a8fce6f9f35";
const CURRENT_BENCHMARK_HASH =
  "b79108b025e697822f0f59de477fa68066c1c05c228fae2270cd230af84e8a7b";

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

const clean = (value) =>
  value === null || value === undefined
    ? ""
    : String(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const normalizeHeading = (value) => clean(value).toLowerCase().replace(/[–—]/g, "-");
const normalizeCountry = (value) =>
  normalizeHeading(value).replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const cnDigits = (value) => clean(value).replace(/\D/g, "");
const sha256 = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

const parseNumber = (value) => {
  const str = clean(value);
  if (!str || str === "-" || str === "–" || /^n\/?a$/i.test(str) || /see below/i.test(str)) return null;
  const match = str.replace(/\s/g, "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
};
const routeIndicatorFromText = (value) => {
  const match = clean(value).match(/\(([A-HJKL])\)/i);
  return match ? match[1].toUpperCase() : null;
};
const sectorFromText = (value) => {
  const normalized = normalizeHeading(value).replace(/:$/, "");
  if (SECTORS.has(normalized)) return SECTORS.get(normalized);
  for (const [needle, sector] of SECTORS.entries()) {
    if (normalized === needle || normalized.startsWith(`${needle} `)) return sector;
  }
  return null;
};
const isLikelyCountryHeading = (row) => {
  const cells = row.map(clean).filter(Boolean);
  if (cells.length !== 1) return false;
  const value = cells[0];
  const lower = normalizeHeading(value);
  if (sectorFromText(value)) return false;
  if (/annex|default values|benchmark|cn code|description|tco2|direct emissions|indirect emissions|total emissions|production route/.test(lower)) return false;
  if (/^\d/.test(lower)) return false;
  return value.length <= 120;
};
const findHeaderIndex = (row, tests) => {
  const normalized = row.map((v) => normalizeHeading(v));
  return normalized.findIndex((v) => tests.some((test) => test(v)));
};
const detectDefaultHeader = (row) => {
  const joined = row.map(normalizeHeading).join(" | ");
  if (!joined.includes("default value") || !joined.includes("total emissions")) return null;
  const cn = findHeaderIndex(row, [(v) => v.includes("product cn code"), (v) => v.includes("cn code"), (v) => v.includes("taric code")]);
  const description = findHeaderIndex(row, [(v) => v.includes("description")]);
  const direct = findHeaderIndex(row, [(v) => v.includes("direct emissions")]);
  const indirect = findHeaderIndex(row, [(v) => v.includes("indirect emissions")]);
  const total = findHeaderIndex(row, [(v) => v.includes("total emissions")]);
  const route = findHeaderIndex(row, [(v) => v.includes("production route")]);
  if (cn < 0 || total < 0) return null;
  return { cn, description, direct, indirect, total, route };
};
const detectBenchmarkHeader = (row) => {
  const normalized = row.map(normalizeHeading);
  const joined = normalized.join(" | ");
  if (!joined.includes("cn code") || !joined.includes("column a") || !joined.includes("column b")) return null;
  const cn = normalized.findIndex((v) => v === "cn code" || v.includes("cn code"));
  const description = normalized.findIndex((v) => v.includes("description"));
  const colA = normalized.findIndex((v) => v.includes("column a") && !v.includes("production route indicator"));
  const colAIndicator = normalized.findIndex((v) => v.includes("column a") && v.includes("production route indicator"));
  const colB = normalized.findIndex((v) => v.includes("column b") && !v.includes("production route indicator"));
  const colBIndicator = normalized.findIndex((v) => v.includes("column b") && v.includes("production route indicator"));
  if (cn < 0 || colA < 0 || colB < 0) return null;
  return { cn, description, colA, colAIndicator, colB, colBIndicator };
};
const readWorkbook = (buffer) => XLSX.read(buffer, { type: "buffer", raw: false, cellDates: false });
const rowsForSheet = (workbook, sheetName) => XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: "", blankrows: true });

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
      if (detectedHeader) { header = detectedHeader; continue; }
      const first = nonEmpty[0];
      const sector = sectorFromText(first);
      if (sector && nonEmpty.length <= 2) { currentSector = sector; continue; }
      if (isLikelyCountryHeading(row)) { currentCountry = first; header = null; continue; }
      if (!header || !currentCountry) continue;
      const rawCn = cells[header.cn] || "";
      const digits = cnDigits(rawCn);
      if (digits.length < 4) { const inlineSector = sectorFromText(rawCn); if (inlineSector) currentSector = inlineSector; continue; }
      const direct = header.direct >= 0 ? parseNumber(cells[header.direct]) : null;
      const indirect = header.indirect >= 0 ? parseNumber(cells[header.indirect]) : null;
      const total = parseNumber(cells[header.total]);
      const routeText = header.route >= 0 ? cells[header.route] : "";
      const routeIndicator = routeIndicatorFromText(routeText);
      if (direct === null && indirect === null && total === null && !routeIndicator) continue;
      records.push({
        sourceSheet: sheetName, sourceRow: i + 1, country: currentCountry,
        countryNormalized: normalizeCountry(currentCountry), sector: currentSector,
        cnCode: rawCn, cnDigits: digits,
        description: header.description >= 0 ? cells[header.description] || null : null,
        directEmissions: direct, indirectEmissions: indirect, totalEmissions: total,
        productionRouteIndicator: routeIndicator,
        productionRouteLabel: routeIndicator ? ROUTES[routeIndicator] || null : null,
        rawData: { row: cells, routeText: routeText || null },
      });
    }
  }
  return records;
};

const parseBenchmarkIndicator = (valueCell, indicatorCell) => {
  const combined = `${clean(valueCell)} ${clean(indicatorCell)}`.trim();
  const routeMatch = combined.match(/\(([A-HJKL])\)/i);
  const yearMatch = combined.match(/\(([12])\)/);
  const routeIndicator = routeMatch ? routeMatch[1].toUpperCase() : null;
  const yearMarker = yearMatch ? yearMatch[1] : null;
  return {
    routeIndicator,
    routeLabel: routeIndicator ? ROUTES[routeIndicator] || null : null,
    productionYearFrom: yearMarker === "2" ? 2028 : 2026,
    productionYearTo: yearMarker === "1" ? 2027 : 2030,
    rawIndicator: clean(indicatorCell) || null,
  };
};
const parseBenchmarkValue = (valueCell, indicatorCell) => {
  const value = parseNumber(valueCell);
  if (value === null) return null;
  return { value, ...parseBenchmarkIndicator(valueCell, indicatorCell), rawCell: clean(valueCell) };
};
const parseBenchmarkWorkbook = (buffer) => {
  const wb = readWorkbook(buffer);
  const records = [];
  for (const sheetName of wb.SheetNames) {
    const rows = rowsForSheet(wb, sheetName);
    let currentSector = null, header = null, currentCnCode = null, currentCnDigits = null, currentDescription = null;
    for (let i = 0; i < rows.length; i += 1) {
      const row = Array.isArray(rows[i]) ? rows[i] : [];
      const cells = row.map(clean);
      const nonEmpty = cells.filter(Boolean);
      if (!nonEmpty.length) continue;
      const detectedHeader = detectBenchmarkHeader(row);
      if (detectedHeader) { header = detectedHeader; currentCnCode = currentCnDigits = currentDescription = null; continue; }
      const first = nonEmpty[0];
      const sector = sectorFromText(first);
      if (sector && nonEmpty.length <= 2) { currentSector = sector; currentCnCode = currentCnDigits = currentDescription = null; continue; }
      if (!header) continue;
      const rawCn = cells[header.cn] || "";
      const digits = cnDigits(rawCn);
      if (digits.length >= 4) {
        currentCnCode = rawCn; currentCnDigits = digits;
        const d = header.description >= 0 ? cells[header.description] || null : null;
        if (d) currentDescription = d;
      } else if (rawCn) continue;
      if (!currentCnCode || !currentCnDigits) continue;
      const description = header.description >= 0 && cells[header.description] ? cells[header.description] : currentDescription;
      const actual = parseBenchmarkValue(cells[header.colA], header.colAIndicator >= 0 ? cells[header.colAIndicator] : "");
      const def = parseBenchmarkValue(cells[header.colB], header.colBIndicator >= 0 ? cells[header.colBIndicator] : "");
      for (const [kind, item] of [["actual", actual], ["default", def]]) {
        if (!item) continue;
        records.push({
          sourceSheet: sheetName, sourceRow: i + 1, sector: currentSector,
          cnCode: currentCnCode, cnDigits: currentCnDigits, description,
          benchmarkKind: kind, value: item.value, routeIndicator: item.routeIndicator,
          routeLabel: item.routeLabel, productionYearFrom: item.productionYearFrom,
          productionYearTo: item.productionYearTo, rawCell: item.rawCell,
          rawData: { row: cells, indicator: item.rawIndicator },
        });
      }
    }
  }
  return records;
};

/** Best-effort parser for Annex III electricity factors. It fails closed. */
const parseElectricityWorkbook = (buffer) => {
  const wb = readWorkbook(buffer);
  const records = [];
  for (const sheetName of wb.SheetNames) {
    const rows = rowsForSheet(wb, sheetName);
    let electricityContext = /electricity/i.test(sheetName);
    let header = null;
    for (let i = 0; i < rows.length; i += 1) {
      const cells = (Array.isArray(rows[i]) ? rows[i] : []).map(clean);
      const joined = cells.join(" | ");
      if (/annex\s+iii|default values.*electricity|electricity.*default values/i.test(joined)) electricityContext = true;
      if (!electricityContext) continue;
      const normalized = cells.map(normalizeHeading);
      const countryIdx = normalized.findIndex((v) => /country|territor/.test(v));
      const efIdx = normalized.findIndex((v) => /emission factor|t\s*co2.*mwh|co2.*mwh/.test(v));
      if (countryIdx >= 0 && efIdx >= 0) { header = { countryIdx, efIdx }; continue; }
      if (header) {
        const country = cells[header.countryIdx];
        const value = parseNumber(cells[header.efIdx]);
        if (country && value !== null && value >= 0 && value < 5 && !/country|territor|union-wide/i.test(country)) {
          records.push({ country, countryNormalized: normalizeCountry(country), emissionFactor: value, sourceSheet: sheetName, sourceRow: i + 1, rawData: { row: cells } });
        }
      }
    }
  }
  const unique = new Map();
  for (const row of records) unique.set(row.countryNormalized, row);
  return [...unique.values()];
};

const validate = (defaults, benchmarks, electricity, hashes) => {
  const countries = new Set(defaults.map((r) => r.countryNormalized));
  const defaultSectors = new Set(defaults.map((r) => r.sector).filter(Boolean));
  const benchmarkSectors = new Set(benchmarks.map((r) => r.sector).filter(Boolean));
  const routes = new Set(benchmarks.map((r) => r.routeIndicator).filter(Boolean));
  const failures = [];
  if (defaults.length < 5000) failures.push(`Default-value row count too low: ${defaults.length}`);
  if (countries.size < 80) failures.push(`Country count too low: ${countries.size}`);
  for (const sector of ["cement","fertiliser","hydrogen","iron_steel","aluminium"]) {
    if (!defaultSectors.has(sector)) failures.push(`Missing default-value sector: ${sector}`);
    if (!benchmarkSectors.has(sector)) failures.push(`Missing benchmark sector: ${sector}`);
  }
  if (benchmarks.length < 1000) failures.push(`Benchmark row count too low: ${benchmarks.length}`);
  for (const route of ["A","B","C","D","E","F","G","H","J","K","L"]) {
    if (!routes.has(route)) failures.push(`Missing benchmark route: ${route}`);
  }
  if (hashes.defaults === CURRENT_DEFAULT_HASH) {
    const r = defaults.find((x) => x.countryNormalized === "albania" && x.cnDigits === "2523100090" && x.productionRouteIndicator === "A");
    if (!r || Math.abs(Number(r.totalEmissions) - 0.87) > 1e-9) failures.push("Current-workbook control Albania 2523100090 = 0.87/A failed.");
  }
  if (hashes.benchmarks === CURRENT_BENCHMARK_HASH) {
    const required = [
      ["25231000","default","A",0.666,2026,2030], ["25231000","default","B",0.859,2026,2030],
      ["25233000","default",null,0.717,2026,2027], ["25233000","default",null,0.686,2028,2030],
    ];
    for (const [cn,kind,route,value,from,to] of required) {
      if (!benchmarks.some((r) => r.cnDigits===cn && r.benchmarkKind===kind && r.routeIndicator===route && r.productionYearFrom===from && r.productionYearTo===to && Math.abs(r.value-value)<1e-9)) failures.push(`Current benchmark control failed: ${cn}/${kind}/${route ?? "none"}/${from}-${to}`);
    }
  }
  return {
    passed: failures.length === 0,
    failures,
    summary: { defaultRows: defaults.length, benchmarkRows: benchmarks.length, countries: countries.size, electricityRows: electricity.length, routes: [...routes].sort() },
    electricityReady: electricity.length >= 20,
  };
};

const absoluteHref = (href) => new URL(href.replace(/&amp;/g, "&"), GUIDANCE_PAGE).toString();
const discoverLinks = (html) => {
  const anchors = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: absoluteHref(m[1]), text: clean(m[2].replace(/<[^>]+>/g, " ")) }));
  const xlsx = anchors.filter((a) => /\.xlsx(?:$|[?&])/i.test(a.href) || /filename=.*\.xlsx/i.test(a.href));
  let defaults = xlsx.find((a) => /default/i.test(a.text) || /DV\+|default/i.test(a.href));
  let benchmarks = xlsx.find((a) => /benchmark/i.test(a.text) || /benchmark/i.test(a.href));
  if (!defaults) {
    const m = html.match(/Default values definitive period[\s\S]{0,2500}?href=["']([^"']+\.xlsx[^"']*)["']/i);
    if (m) defaults = { href: absoluteHref(m[1]), text: "Default values definitive period" };
  }
  if (!benchmarks) {
    const m = html.match(/Benchmarks definitive period[\s\S]{0,2500}?href=["']([^"']+\.xlsx[^"']*)["']/i);
    if (m) benchmarks = { href: absoluteHref(m[1]), text: "Benchmarks definitive period" };
  }
  if (!defaults || !benchmarks) throw new Error("Could not discover both official default-value and benchmark XLSX links from the Commission guidance page.");
  return { defaultsUrl: defaults.href, benchmarksUrl: benchmarks.href };
};

const fetchBuffer = async (url, accept) => {
  const response = await fetch(url, { headers: { "User-Agent": "GreenEngineeringTools-CBAM-ReferenceSync/5.0", Accept: accept }, cache: "no-store" });
  if (!response.ok) throw new Error(`Official reference download failed: HTTP ${response.status} (${url})`);
  return Buffer.from(await response.arrayBuffer());
};

const chunks = (rows, n=500) => Array.from({length: Math.ceil(rows.length/n)}, (_,i)=>rows.slice(i*n,(i+1)*n));

async function insertDefaults(sql, rows, meta) {
  for (const chunk of chunks(rows)) {
    const payload = chunk.map((r) => ({ source_sheet:r.sourceSheet, source_row:r.sourceRow, country:r.country, country_normalized:r.countryNormalized, sector:r.sector, cn_code:r.cnCode, cn_digits:r.cnDigits, cn_digits_length:r.cnDigits.length, description:r.description, direct_emissions:r.directEmissions, indirect_emissions:r.indirectEmissions, total_emissions:r.totalEmissions, production_route_indicator:r.productionRouteIndicator, production_route_label:r.productionRouteLabel, raw_data:r.rawData }));
    await sql`
      INSERT INTO cbam_official_default_values (
        source_version, source_regulation, source_url, source_sheet, source_row,
        country, country_normalized, sector, cn_code, cn_digits, cn_digits_length,
        description, direct_emissions, indirect_emissions, total_emissions,
        production_route_indicator, production_route_label, raw_data
      )
      SELECT ${meta.version}, ${meta.regulation}, ${meta.url}, x.*
      FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS x(
        source_sheet text, source_row integer, country text, country_normalized text,
        sector text, cn_code text, cn_digits text, cn_digits_length integer,
        description text, direct_emissions double precision, indirect_emissions double precision,
        total_emissions double precision, production_route_indicator text,
        production_route_label text, raw_data jsonb
      )
    `;
  }
}

async function insertBenchmarks(sql, rows, meta) {
  for (const chunk of chunks(rows)) {
    const payload = chunk.map((r) => ({ source_sheet:r.sourceSheet, source_row:r.sourceRow, sector:r.sector, cn_code:r.cnCode, cn_digits:r.cnDigits, cn_digits_length:r.cnDigits.length, description:r.description, benchmark_kind:r.benchmarkKind, benchmark_value:r.value, production_route_indicator:r.routeIndicator, production_route_label:r.routeLabel, production_year_from:r.productionYearFrom, production_year_to:r.productionYearTo, raw_cell:r.rawCell, raw_data:r.rawData }));
    await sql`
      INSERT INTO cbam_official_benchmarks (
        source_version, source_regulation, source_url, source_sheet, source_row,
        sector, cn_code, cn_digits, cn_digits_length, description, benchmark_kind,
        benchmark_value, production_route_indicator, production_route_label,
        production_year_from, production_year_to, raw_cell, raw_data
      )
      SELECT ${meta.version}, ${meta.regulation}, ${meta.url}, x.*
      FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS x(
        source_sheet text, source_row integer, sector text, cn_code text, cn_digits text,
        cn_digits_length integer, description text, benchmark_kind text,
        benchmark_value double precision, production_route_indicator text,
        production_route_label text, production_year_from integer, production_year_to integer,
        raw_cell text, raw_data jsonb
      )
    `;
  }
}

async function insertElectricity(sql, rows, meta) {
  for (const chunk of chunks(rows)) {
    const payload = chunk.map((r) => ({ country:r.country, country_normalized:r.countryNormalized, emission_factor:r.emissionFactor, raw_data:r.rawData }));
    await sql`
      INSERT INTO cbam_electricity_default_values (
        source_version, source_regulation, source_url, country, country_normalized,
        reporting_year_from, reporting_year_to, emission_factor_tco2_per_mwh, raw_data
      )
      SELECT ${meta.version}, ${meta.regulation}, ${meta.url}, x.country, x.country_normalized,
             2026, 9999, x.emission_factor, x.raw_data
      FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb) AS x(
        country text, country_normalized text, emission_factor double precision, raw_data jsonb
      )
    `;
  }
}

async function stageDataset(sql, data) {
  await sql`
    INSERT INTO cbam_reference_datasets (
      dataset_type, source_version, sha256, source_url, source_filename,
      source_regulation, legal_basis_url, parser_version, status, row_count, validation
    ) VALUES (
      ${data.type}, ${data.version}, ${data.hash}, ${data.url}, ${data.filename},
      ${data.regulation}, ${data.legalBasisUrl}, ${PARSER_VERSION}, 'staged', ${data.rowCount},
      ${JSON.stringify(data.validation)}::jsonb
    ) ON CONFLICT (dataset_type, source_version, sha256) DO UPDATE SET
      validation = EXCLUDED.validation, row_count = EXCLUDED.row_count
  `;
}

async function activateDataset(sql, type, version, hash) {
  await sql`UPDATE cbam_reference_datasets SET status='superseded' WHERE dataset_type=${type} AND status='active' AND source_version<>${version}`;
  await sql`UPDATE cbam_reference_datasets SET status='active', activated_at=NOW() WHERE dataset_type=${type} AND source_version=${version} AND sha256=${hash}`;
  await sql`
    INSERT INTO cbam_reference_active (dataset_type, source_version, sha256, updated_at)
    VALUES (${type}, ${version}, ${hash}, NOW())
    ON CONFLICT (dataset_type) DO UPDATE SET source_version=EXCLUDED.source_version, sha256=EXCLUDED.sha256, updated_at=NOW()
  `;
}

export async function syncOfficialCbamReferenceData(options={}) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  const sql = neon(process.env.DATABASE_URL);
  const force = Boolean(options.force);
  const minIntervalHours = Math.max(6, Number(options.minIntervalHours ?? 24));
  const autoActivate = options.autoActivate ?? process.env.CBAM_AUTO_ACTIVATE_REFERENCE_UPDATES !== "false";

  const state = await sql`SELECT last_attempt_at FROM cbam_sync_state WHERE sync_key='official_reference_datasets' LIMIT 1`;
  const last = state[0]?.last_attempt_at ? new Date(state[0].last_attempt_at).getTime() : 0;
  if (!force && last && Date.now()-last < minIntervalHours*3600_000) return {success:true, skipped:true, reason:"Reference sync is inside the throttle interval."};

  await sql`INSERT INTO cbam_sync_state(sync_key,last_attempt_at,updated_at) VALUES('official_reference_datasets',NOW(),NOW()) ON CONFLICT(sync_key) DO UPDATE SET last_attempt_at=NOW(),updated_at=NOW()`;
  const run = await sql`INSERT INTO cbam_reference_sync_runs(status,source_page_url) VALUES('running',${GUIDANCE_PAGE}) RETURNING id`;
  const runId = run[0].id;

  try {
    const page = await fetch(GUIDANCE_PAGE, { headers:{"User-Agent":"GreenEngineeringTools-CBAM-ReferenceSync/5.0"}, cache:"no-store" });
    if (!page.ok) throw new Error(`Commission guidance page returned HTTP ${page.status}.`);
    const html = await page.text();
    const links = discoverLinks(html);
    const [defaultBuffer, benchmarkBuffer] = await Promise.all([
      fetchBuffer(links.defaultsUrl, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*"),
      fetchBuffer(links.benchmarksUrl, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*"),
    ]);
    const hashes = {defaults:sha256(defaultBuffer), benchmarks:sha256(benchmarkBuffer)};
    const defaults = parseDefaultWorkbook(defaultBuffer);
    const benchmarks = parseBenchmarkWorkbook(benchmarkBuffer);
    const electricity = parseElectricityWorkbook(defaultBuffer);
    const validation = validate(defaults, benchmarks, electricity, hashes);
    if (!validation.passed) throw new Error(`Reference dataset validation failed: ${validation.failures.join("; ")}`);

    const day = new Date().toISOString().slice(0,10);
    const defaultsVersion = `EU-default-values-auto-${day}-${hashes.defaults.slice(0,8)}`;
    const benchmarksVersion = `EU-benchmarks-auto-${day}-${hashes.benchmarks.slice(0,8)}`;
    const electricityVersion = `EU-electricity-defaults-auto-${day}-${hashes.defaults.slice(0,8)}`;
    const defaultReg = /2026\/1740/.test(html)
      ? "Implementing Regulation (EU) 2025/2621 corrected by (EU) 2026/1740"
      : "Commission definitive-period default-values publication — legal basis requires review";
    const benchmarkReg = /2025\/2620/.test(html)
      ? "Implementing Regulation (EU) 2025/2620"
      : "Commission definitive-period benchmark publication — legal basis requires review";
    const legalSafe = /2025\/2621/.test(html) && /2025\/2620/.test(html);

    const active = await sql`SELECT dataset_type, source_version, sha256 FROM cbam_reference_active`;
    const activeMap = new Map(active.map((r)=>[r.dataset_type,r]));
    const toInsertDefaults = activeMap.get('default_values')?.sha256 !== hashes.defaults;
    const toInsertBenchmarks = activeMap.get('benchmarks')?.sha256 !== hashes.benchmarks;
    const toInsertElectricity = validation.electricityReady && activeMap.get('electricity_defaults')?.sha256 !== hashes.defaults;

    if (toInsertDefaults) {
      await stageDataset(sql,{type:'default_values',version:defaultsVersion,hash:hashes.defaults,url:links.defaultsUrl,filename:new URL(links.defaultsUrl).searchParams.get('filename'),regulation:defaultReg,legalBasisUrl:GUIDANCE_PAGE,rowCount:defaults.length,validation});
      await insertDefaults(sql, defaults, {version:defaultsVersion, regulation:defaultReg, url:links.defaultsUrl});
    }
    if (toInsertBenchmarks) {
      await stageDataset(sql,{type:'benchmarks',version:benchmarksVersion,hash:hashes.benchmarks,url:links.benchmarksUrl,filename:new URL(links.benchmarksUrl).searchParams.get('filename'),regulation:benchmarkReg,legalBasisUrl:GUIDANCE_PAGE,rowCount:benchmarks.length,validation});
      await insertBenchmarks(sql, benchmarks, {version:benchmarksVersion, regulation:benchmarkReg, url:links.benchmarksUrl});
    }
    if (toInsertElectricity) {
      await stageDataset(sql,{type:'electricity_defaults',version:electricityVersion,hash:hashes.defaults,url:links.defaultsUrl,filename:new URL(links.defaultsUrl).searchParams.get('filename'),regulation:defaultReg,legalBasisUrl:GUIDANCE_PAGE,rowCount:electricity.length,validation});
      await insertElectricity(sql, electricity, {version:electricityVersion, regulation:defaultReg, url:links.defaultsUrl});
    }

    const activated = [];
    if (autoActivate && legalSafe) {
      if (toInsertDefaults) { await activateDataset(sql,'default_values',defaultsVersion,hashes.defaults); activated.push(['default_values',defaultsVersion]); }
      if (toInsertBenchmarks) { await activateDataset(sql,'benchmarks',benchmarksVersion,hashes.benchmarks); activated.push(['benchmarks',benchmarksVersion]); }
      if (toInsertElectricity) { await activateDataset(sql,'electricity_defaults',electricityVersion,hashes.defaults); activated.push(['electricity_defaults',electricityVersion]); }
    }

    await sql`UPDATE cbam_reference_sync_runs SET status='success',finished_at=NOW(),discovered=${JSON.stringify({...links,hashes})}::jsonb,validation=${JSON.stringify(validation)}::jsonb,activated=${JSON.stringify(activated)}::jsonb WHERE id=${runId}`;
    await sql`INSERT INTO cbam_sync_state(sync_key,last_attempt_at,last_success_at,last_error,last_items_saved,updated_at) VALUES('official_reference_datasets',NOW(),NOW(),NULL,${activated.length},NOW()) ON CONFLICT(sync_key) DO UPDATE SET last_attempt_at=NOW(),last_success_at=NOW(),last_error=NULL,last_items_saved=${activated.length},updated_at=NOW()`;

    return {success:true,skipped:false,links,hashes,validation,legalSafe,autoActivate,activated,staged:{defaultValues:toInsertDefaults,benchmarks:toInsertBenchmarks,electricityDefaults:toInsertElectricity}};
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown reference sync error";
    await sql`UPDATE cbam_reference_sync_runs SET status='failed',finished_at=NOW(),error=${message} WHERE id=${runId}`;
    await sql`INSERT INTO cbam_sync_state(sync_key,last_attempt_at,last_error,updated_at) VALUES('official_reference_datasets',NOW(),${message},NOW()) ON CONFLICT(sync_key) DO UPDATE SET last_error=${message},updated_at=NOW()`;
    throw error;
  }
}
