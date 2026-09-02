import fs from "node:fs";
import path from "node:path";

const file = path.resolve("app/page.tsx");

if (!fs.existsSync(file)) {
  console.error(`FAIL missing ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const checks = [
  ["full GWP row coverage gate", /const gwpCoverageComplete =/],
  ["LEED gate checks rowsWithGwp", /baselineReport\.rowsWithGwp === baselineReport\.lines\.length/],
  ["LEED gate checks proposed rowsWithGwp", /proposedReport\.rowsWithGwp === proposedReport\.lines\.length/],
  ["incomplete coverage blocks assessment", /Complete material-level GWP coverage is required before reduction criteria are evaluated/],
  ["comparison UI shows incomplete GWP warning", /Incomplete material-level GWP coverage/],
  ["comparison UI says available scope is not complete whole-building result", /must not be interpreted as a complete whole-building result/],
  ["PDF-safe text helper exists", /const pdfSafeText =/],
  ["PDF-safe helper handles subscript 2", /\.replace\(\/₂\/g, "2"\)/],
  ["PDF-safe helper handles subscript 3", /\.replace\(\/₃\/g, "3"\)/],
  ["PDF-safe helper handles squared symbol", /\.replace\(\/²\/g, "2"\)/],
  ["PDF-safe helper handles >= symbol", /\.replace\(\/≥\/g, ">="\)/],
  ["comparison PDF sanitizes impact units", /pdfSafeText\(`\$\{fmtMetricValue\(item\.metric, item\.baseline\)\} \$\{item\.unit\}`\)/],
  ["comparison PDF sanitizes LEED note", /pdfSafeText\(`Indicative LEED-style logic:/],
  ["single PDF sanitizes warnings", /pdfSafeText\(warning\)/],
  ["single PDF sanitizes material names", /pdfSafeText\(line\.row\.materialName\)/],
  ["single PDF uses ASCII m2", /Gross floor area: \$\{fmt\(floorAreaM2, 1\)\} m2/],
  ["percentage formatter exists", /const fmtPercent =/],
  ["module PDF reduction no longer creates N-A percent", /fmtPercent\(reductionPct\(baselineValue, proposedValue\), 2\)/],
  ["comparison table uses safe percentage formatter", /fmtPercent\(metric\.reduction, 2\)/],
  ["comparison PDF exposes GWP row coverage", /"GWP row coverage"/],
];

let passed = 0;

for (const [name, pattern] of checks) {
  if (pattern.test(source)) {
    console.log(`PASS ${name}`);
    passed += 1;
  } else {
    console.log(`FAIL ${name}`);
  }
}

if (passed !== checks.length) {
  console.error(`\n${passed}/${checks.length} V2.3 report-safety checks passed.`);
  process.exit(1);
}

console.log(`\nPASS — ${passed}/${checks.length} V2.3 report-safety checks passed.`);
