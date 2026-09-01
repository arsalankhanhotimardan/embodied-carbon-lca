import fs from "node:fs";
import path from "node:path";

const file = path.resolve("app/cbam-calculator/page.tsx");

if (!fs.existsSync(file)) {
  console.error(`FAIL missing ${file}`);
  process.exit(1);
}

const source = fs.readFileSync(file, "utf8");

const checks = [
  ["portfolio PDF generator", /const generatePortfolioPDF = \(\) =>/],
  ["portfolio CSV exporter", /const exportPortfolioCSV = \(\) =>/],
  ["PDF button", /Download Portfolio PDF/],
  ["CSV button", /Export Portfolio CSV/],
  ["annual year grouping", /const portfolioYearSummary = useMemo/],
  ["effective threshold values", /const getPortfolioEffectiveValues/],
  ["effective certificates CSV field", /Effective_Certificates_After_Threshold/],
  ["raw certificates audit field", /Raw_Certificates/],
  ["effective cost CSV field", /Effective_Estimated_Cost_EUR/],
  ["spreadsheet formula-injection guard", /spreadsheetSafeText/],
  ["UTF-8 BOM CSV", /\\uFEFF/],
  ["PDF planning disclaimer", /not an EU CBAM Registry filing/],
  ["electricity and hydrogen threshold note", /Electricity and hydrogen do not use this mass-based exemption/],
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
  console.error(`\n${passed}/${checks.length} portfolio export checks passed.`);
  process.exit(1);
}

console.log(`\nPASS — ${passed}/${checks.length} portfolio export checks passed.`);
