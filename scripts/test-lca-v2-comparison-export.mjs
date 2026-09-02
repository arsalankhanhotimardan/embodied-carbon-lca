import fs from "node:fs";
import path from "node:path";

const file = path.resolve("app/page.tsx");

if (!fs.existsSync(file)) {
  console.error(`FAIL missing ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const checks = [
  ["comparison CSV generator", /const exportComparisonCsv = \(\) =>/],
  ["comparison PDF generator", /const exportComparisonPdf = \(\) =>/],
  ["comparison CSV dispatcher", /activeView === "comparison"[\s\S]*exportComparisonCsv\(\)/],
  ["comparison PDF dispatcher", /activeView === "comparison"[\s\S]*exportComparisonPdf\(\)/],
  ["comparison CSV button", /Compare CSV/],
  ["comparison PDF button", /Compare PDF/],
  ["comparison buttons enabled when both models exist", /activeView === "comparison" \? !isComparing : !currentReport/],
  ["comparison PDF includes impact categories", /Impact category/],
  ["comparison PDF includes lifecycle modules", /Lifecycle Module GWP/],
  ["comparison PDF includes data quality", /Data Quality/],
  ["comparison CSV includes data quality", /"Data quality"/],
  ["comparison CSV includes Module D", /Module D reported separately from A-C/],
  ["small metric precision formatter", /const fmtMetricValue =/],
  ["ozone uses higher precision", /metric === "ozone"\) return fmt\(value, 6\)/],
  ["comparison table uses metric precision formatter", /fmtMetricValue\(metric\.metric, metric\.baseline\)/],
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
  console.error(`\n${passed}/${checks.length} comparison-export checks passed.`);
  process.exit(1);
}

console.log(`\nPASS — ${passed}/${checks.length} comparison-export checks passed.`);
