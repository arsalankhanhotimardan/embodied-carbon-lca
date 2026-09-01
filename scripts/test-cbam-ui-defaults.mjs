import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  {
    file: "app/cbam-calculator/actual-data/page.tsx",
    forbidden: [
      /useState\(["']Türkiye["']\)/,
      /useState\(["']7208["']\)/,
      /useState\(["']C["']\)/,
      /useState\(100\)/,
      /useState\(200\)/,
      /useState\(75\.28\)/,
    ],
  },
  {
    file: "app/cbam-calculator/electricity/page.tsx",
    forbidden: [
      /useState\(["']Türkiye["']\)/,
      /useState\(100\)/,
      /useState\(75\.28\)/,
      /useState\(0\.4\)/,
    ],
  },
  {
    file: "app/cbam-calculator/bulk/page.tsx",
    forbidden: [/useState\(75\.28\)/, /useState\(75\.36\)/],
  },
  {
    file: "app/api/cbam/years/route.ts",
    forbidden: [/d\.source_hash\b/, /d\.legal_basis\b/],
  },
];

let failed = false;
for (const check of checks) {
  const file = path.join(root, check.file);
  if (!fs.existsSync(file)) {
    console.error(`FAIL missing ${check.file}`);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of check.forbidden) {
    if (pattern.test(text)) {
      console.error(`FAIL ${check.file}: forbidden regression ${pattern}`);
      failed = true;
    }
  }
  if (!failed) console.log(`PASS ${check.file}`);
}

if (failed) process.exit(1);
console.log("PASS — no known demo-default/schema regression found.");
