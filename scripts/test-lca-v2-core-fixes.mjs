import fs from "node:fs";
import path from "node:path";

const pagePath = path.resolve("app/page.tsx");

if (!fs.existsSync(pagePath)) {
  console.error(`FAIL missing ${pagePath}`);
  process.exit(1);
}

const source = fs.readFileSync(pagePath, "utf8");

function splitQuantityAndUnit(raw) {
  const original = String(raw ?? "").trim();
  if (!original) {
    return { quantityFromUnit: null, unitText: "unit", wasMissing: true };
  }

  const normalized = original
    .replace(/,/g, "")
    .replace(/[×x]\s*10\^?\s*([+-]?\d+)/gi, "e$1")
    .trim();

  const match = normalized.match(
    /^([+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?)\s*(.+)$/i
  );

  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > 0 && match[2].trim()) {
      return {
        quantityFromUnit: parsed,
        unitText: match[2].trim(),
        wasMissing: false,
      };
    }
  }

  return { quantityFromUnit: null, unitText: original, wasMissing: false };
}

function canonicalUnit(raw) {
  const basis = splitQuantityAndUnit(raw);
  const v = basis.unitText
    .toLowerCase()
    .trim()
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/[·*]/g, "")
    .replace(/\./g, "")
    .replace(/[\s_-]+/g, "");

  const aliases = {
    g: "g",
    gram: "g",
    grams: "g",
    kg: "kg",
    kilogram: "kg",
    kilograms: "kg",
    t: "t",
    ton: "t",
    tons: "t",
    tonne: "t",
    tonnes: "t",
    metricton: "t",
    metrictons: "t",
    metrictonne: "t",
    metrictonnes: "t",
    lb: "lb",
    lbs: "lb",
    m3: "m3",
    m2: "m2",
    unit: "unit",
  };

  return aliases[v] || v;
}

function unitInfo(raw) {
  const unit = canonicalUnit(raw);
  const info = {
    g: { dimension: "mass", toSI: 0.001 },
    kg: { dimension: "mass", toSI: 1 },
    t: { dimension: "mass", toSI: 1000 },
    lb: { dimension: "mass", toSI: 0.45359237 },
    m3: { dimension: "volume", toSI: 1 },
    m2: { dimension: "area", toSI: 1 },
    unit: { dimension: "count", toSI: 1 },
  };
  return { unit, ...(info[unit] || { dimension: "unknown", toSI: 1 }) };
}

function sameDimensionConvert(quantity, fromRaw, toRaw) {
  const from = unitInfo(fromRaw);
  const to = unitInfo(toRaw);
  if (from.dimension !== to.dimension || from.dimension === "unknown") {
    return null;
  }
  return (quantity * from.toSI) / to.toSI;
}

const checks = [];

function check(name, condition, detail = "") {
  if (condition) {
    console.log(`PASS ${name}`);
    checks.push(true);
  } else {
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    checks.push(false);
  }
}

check("1 metric ton normalizes to t", canonicalUnit("1 metric ton") === "t");
check("1.0 ton normalizes to t", canonicalUnit("1.0 ton") === "t");
check("metric tonne normalizes to t", canonicalUnit("metric tonne") === "t");
check(
  "8000 kg converts to 8 metric tonnes",
  Math.abs(sameDimensionConvert(8000, "kg", "1 metric ton") - 8) < 1e-12
);
check(
  "4000 kg converts to 4 tonnes",
  Math.abs(sameDimensionConvert(4000, "kg", "1.0 ton") - 4) < 1e-12
);
check(
  "2400 kg converts to 2.4 tonnes",
  Math.abs(sameDimensionConvert(2400, "kg", "metric tonne") - 2.4) < 1e-12
);

const basis1000 = splitQuantityAndUnit("1000 kg");
check(
  "combined 1000 kg declared basis is parsed",
  basis1000.quantityFromUnit === 1000 && canonicalUnit(basis1000.unitText) === "kg"
);

const staticChecks = [
  ["mixed-unit mappedQuantityShare removed", !source.includes("mappedQuantityShare")],
  ["EPD matched rows tracked separately", source.includes("epdMatchedRows")],
  ["unit-compatible rows tracked separately", source.includes("calculableRows")],
  ["rows with GWP tracked separately", source.includes("rowsWithGwp")],
  ["missing CSV distance defaults to 0 km", /distanceKm:\s*distanceKey[\s\S]*?:\s*0,/.test(source)],
  ["stale alias mappings are ignored", source.includes("availableIds.has(mapping.epdId)")],
  ["all EC3 IDs can request detail enrichment", source.includes("if (selectedId) {") && !source.includes("/^ec3/i.test(selectedId)")],
  ["legacy/simple raw.gwp is accepted only as A1-A3 fallback", source.includes("raw?.gwp_mfg") && source.includes("raw?.gwp,")],
  ["missing A1-A3 data produces explicit warning", source.includes("does not provide a supported A1-A3 GWP value")],
  ["count-based EPD mismatch has a specific diagnostic", source.includes("count-based declared unit")],
  ["area-to-mass conversion supports density plus thickness", source.includes('from.dimension === "area" && to.dimension === "mass"')],
  ["A4 planning factor is disclosed in warnings", source.includes("Review/replace this assumption for formal reporting")],
  ["charts do not silently zero-fill missing A1-A3", !source.includes("report.moduleTotals.A1A3?.gwp || 0")],
  ["crossover chart refuses fake zero embodied carbon", source.includes('if (!initialStageValues.length) return []')],
  ["PDF separates EPD match, unit compatibility, and GWP availability", source.includes("EPD matched rows:") && source.includes("Unit-compatible rows:") && source.includes("Rows with available A-C GWP:")],
  ["PDF no longer reports mixed-unit mapped quantity share", !source.includes("Mapped quantity share:")],
  ["missing declared-unit provenance persists", source.includes("declaredUnitWasMissing: Boolean(epd.declaredUnitWasMissing)")],
];

for (const [name, condition] of staticChecks) {
  check(name, condition);
}

const passed = checks.filter(Boolean).length;

if (passed !== checks.length) {
  console.error(`\n${passed}/${checks.length} LCA V2.1 checks passed.`);
  process.exit(1);
}

console.log(`\nPASS — ${passed}/${checks.length} LCA V2.1 core checks passed.`);
