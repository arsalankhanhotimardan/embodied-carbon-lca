import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const lca = read("app/page.tsx");
const cbam = read("app/cbam-calculator/page.tsx");
const actual = read("app/cbam-calculator/actual-data/page.tsx");
const bulk = read("app/cbam-calculator/bulk/page.tsx");
const electricity = read("app/cbam-calculator/electricity/page.tsx");
const workspace = read("src/components/AnonymousWorkspacePanel.tsx");
const projectLib = read("src/lib/lca-projects.ts");
const projectCollection = read("app/api/lca/projects/route.ts");

const checks = [
  ["shared anonymous workspace component", workspace.includes("No signup required")],
  ["browser autosave", workspace.includes("Browser autosave") && workspace.includes("setTimeout")],
  ["download JSON backup", workspace.includes("Download backup") && workspace.includes("application/json")],
  ["import JSON backup", workspace.includes("Import backup") && workspace.includes("file.text()")],
  ["named recent local projects", workspace.includes("Recent anonymous projects") && workspace.includes("Save local copy")],
  ["tool-scoped backup validation", workspace.includes("row.toolId === toolId")],
  ["large local workspace safety", workspace.includes("LOCAL_ITEM_LIMIT_BYTES")],
  ["private LCA backup warning", workspace.includes("private project access key")],

  ["LCA workspace wired", lca.includes('toolId="lca"')],
  ["LCA V2.7 app version", lca.includes('const LCA_APP_VERSION = "LCA-V2.7"')],
  ["LCA V2.5 calculation core frozen", lca.includes('const LCA_CALC_ENGINE_VERSION = "LCA-V2.5"')],
  ["LCA backup includes cloud project key", lca.includes("projectToken") && lca.includes("restoreAnonymousWorkspace")],
  ["LCA no forced account copy", !lca.includes("until account-based authentication is added")],
  ["LCA mobile outer overflow protection", lca.includes("min-w-0 overflow-hidden")],
  ["LCA mobile assembly grid", lca.includes("sm:grid-cols-[minmax(0,1fr)_130px_40px]")],
  ["LCA mobile modal padding", lca.includes("p-2 backdrop-blur-sm sm:p-4")],
  ["LCA quality core completeness", lca.includes('label="Core GWP complete"')],

  ["main CBAM workspace wired", cbam.includes('toolId="cbam-main"')],
  ["main CBAM portfolio restored", cbam.includes("setPortfolio(Array.isArray(raw.portfolio)")],
  ["main CBAM mobile overflow protection", cbam.includes("min-w-0 overflow-x-hidden")],
  ["main CBAM clearer >50t wording", cbam.includes("annual eligible mass exceeds 50 t")],
  ["main CBAM actual benchmark label", cbam.includes("Process CBAM benchmark (actual-data route)")],

  ["actual-data workspace wired", actual.includes('toolId="cbam-actual"')],
  ["actual precursor total mass label", actual.includes("Total precursor mass used (t)")],
  ["actual precursor specific mass display", actual.includes("t precursor / t final good")],
  ["actual precursor production year selector", actual.includes("Precursor production year")],
  ["actual-data mobile inputs", actual.includes("font-size:16px")],

  ["bulk workspace wired", bulk.includes('toolId="cbam-bulk"')],
  ["bulk mobile result table scrolling", bulk.includes('min-w-[1050px]')],
  ["bulk mobile action buttons", bulk.includes("sm:w-auto")],

  ["electricity workspace wired", electricity.includes('toolId="cbam-electricity"')],
  ["electricity mobile one-column mode switch", electricity.includes("grid-cols-1") && electricity.includes("sm:grid-cols-2")],
  ["electricity mobile inputs", electricity.includes("font-size:16px")],

  ["server project version V2.7", projectLib.includes('LCA_APP_VERSION = "LCA-V2.7"')],
  ["anonymous server project messaging", projectCollection.includes("No login is required")],
  ["server projects remain non-enumerable", projectCollection.includes("not globally enumerable")],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed} static check(s) failed.`);
  process.exit(1);
}

console.log(`\n${checks.length}/${checks.length} static checks passed.`);
