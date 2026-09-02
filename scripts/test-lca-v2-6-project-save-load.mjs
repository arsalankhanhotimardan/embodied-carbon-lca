import fs from "node:fs";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const collection = fs.readFileSync(
  new URL("../app/api/lca/projects/route.ts", import.meta.url),
  "utf8"
);
const item = fs.readFileSync(
  new URL("../app/api/lca/projects/[id]/route.ts", import.meta.url),
  "utf8"
);
const migration = fs.readFileSync(
  new URL("../migrations/008_lca_projects.sql", import.meta.url),
  "utf8"
);

const checks = [
  ["V2.6 app marker", page.includes('const LCA_APP_VERSION = "LCA-V2.6"')],
  ["V2.5 core frozen marker", page.includes('const LCA_CALC_ENGINE_VERSION = "LCA-V2.5"')],
  ["project save function", page.includes("const saveProject = async () =>")],
  ["project load function", page.includes("const loadProject = async")],
  ["project delete function", page.includes("const deleteProject = async")],
  ["new project function", page.includes("const startNewProject = () =>")],
  ["source filenames persisted", page.includes("baselineSourceName") && page.includes("proposedSourceName")],
  ["model fingerprint warning", page.includes("identical normalized model fingerprints")],
  ["browser project index", page.includes("lca_v2_6_saved_projects")],
  ["no public global listing", collection.includes("projects are not globally enumerable")],
  ["per-project token generated", collection.includes("randomBytes(32)")],
  ["token hash persisted", collection.includes("editTokenHash")],
  ["single project GET", item.includes("export async function GET")],
  ["single project PUT", item.includes("export async function PUT")],
  ["single project DELETE", item.includes("export async function DELETE")],
  ["token auth enforced", item.includes("projectTokenMatches")],
  ["project table migration", migration.includes("CREATE TABLE IF NOT EXISTS lca_projects")],
  ["baseline JSONB", migration.includes("baseline_rows JSONB")],
  ["proposed JSONB", migration.includes("proposed_rows JSONB")],
  ["Module D CSV wording remains safe", page.includes("moduleDChangeLabel(baselineValue, proposedValue)")],
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
