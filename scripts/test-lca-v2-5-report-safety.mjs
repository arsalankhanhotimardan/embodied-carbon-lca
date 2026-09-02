import fs from "node:fs";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");

const checks = [
  ["core boundary constant", page.includes("const CORE_GWP_BOUNDARY")],
  ["report core rows", page.includes("rowsWithCompleteCoreGwp")],
  ["core completeness share", page.includes("coreGwpCompleteShare")],
  ["LEED core-boundary fail closed", page.includes("configured core GWP boundary")],
  ["Module D credit wording helper", page.includes("moduleDChangeLabel")],
  ["Module D less credit wording", page.includes("% less credit")],
  ["any-GWP wording", page.includes("Rows with at least one A-C GWP value")],
  ["core-complete PDF wording", page.includes("Rows complete for configured core GWP boundary")],
  ["impact category available-module wording", page.includes("Impact category (available modules)")],
  ["methodology clarifies other N/A modules", page.includes("other unavailable modules may still appear as N/A")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}`);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\n${failed} static check(s) failed.`);
  process.exit(1);
}
console.log(`\n${checks.length}/${checks.length} static checks passed.`);
