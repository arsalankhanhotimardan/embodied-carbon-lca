import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
let passed = 0;
const check = (condition, label) => { assert.ok(condition, label); passed += 1; console.log(`✓ ${label}`); };

const required = [
  "src/lib/building-envelope/envelope-engine.ts",
  "src/data/building-envelope/materials.v1.ts",
  "src/data/building-envelope/regional-guidance.v1.ts",
  "src/data/building-envelope/data-manifest.ts",
  "src/components/building-envelope/BuildingEnvelopeDesigner.tsx",
  "src/components/building-envelope/BuildingEnvelopeToolPage.tsx",
  "src/components/building-envelope/ThermalValueConverter.tsx",
  "app/building-envelope/page.tsx",
  "app/building-envelope/insulation-calculator/page.tsx",
  "app/building-envelope/attic-insulation-calculator/page.tsx",
  "app/building-envelope/blown-in-insulation-calculator/page.tsx",
  "app/building-envelope/wall-insulation-calculator/page.tsx",
  "app/building-envelope/r-value-calculator/page.tsx",
  "app/building-envelope/u-value-calculator/page.tsx",
  "app/building-envelope/heat-loss-calculator/page.tsx",
  "app/building-envelope/carbon-payback-calculator/page.tsx",
  "app/building-envelope/methodology/page.tsx",
  "app/sitemap.ts",
  "app/robots.ts",
  "app/layout.tsx",
  "src/components/MobileNav.tsx",
  "scripts/check-building-envelope-sources.mjs",
  ".github/workflows/envelope-source-monitor.yml",
];
required.forEach((file) => check(exists(file), `${file} exists`));

const engine = read("src/lib/building-envelope/envelope-engine.ts");
check(engine.includes("ENVELOPE_ENGINE_VERSION"), "Engine is explicitly versioned");
check(engine.includes("calculateAssembly"), "Assembly calculation exists");
check(engine.includes("calculateInsulationQuantity"), "Insulation quantity calculation exists");
check(engine.includes("calculateHeatLoss"), "Heat-loss calculation exists");
check(engine.includes("calculateRetrofit"), "Retrofit/payback calculation exists");
check(engine.includes("parallel-path"), "Thermal-bridge limitation is documented");
check(!engine.includes("fetch("), "Pure engine has no network dependency");
check(!engine.includes("localStorage"), "Pure engine has no browser-storage dependency");

const designer = read("src/components/building-envelope/BuildingEnvelopeDesigner.tsx");
check(designer.includes("Metric") && designer.includes("Imperial"), "Worldwide unit toggle exists");
check(designer.includes("Shareable calculator link copied"), "Share link feature exists");
check(designer.includes("Print / PDF"), "Print/PDF action exists");
check(designer.includes("localStorage"), "Anonymous autosave exists");
check(designer.includes("scrollIntoView"), "Mobile results auto-scroll exists");
check(designer.includes("Product data needed") || designer.includes("product data"), "Missing product data is surfaced rather than invented");
check(designer.includes("Open EPD Carbon Calculator"), "EPD/LCA cross-tool workflow exists");
check(designer.includes("fabricElements") && designer.includes("retroHdd") && designer.includes("packageCoverageM2"), "Autosave/share state covers all calculation families");
check(designer.includes("usAtticCondition") && designer.includes("existing34"), "U.S. attic guidance distinguishes bare vs existing 3–4 in condition");
check(!designer.includes("adsbygoogle") && !designer.includes("AdBanner"), "Interactive calculator contains no manual ad placement");

const methodology = read("app/building-envelope/methodology/page.tsx");
check(methodology.includes("ISO 6946:2017"), "ISO 6946 reference present");
check(methodology.includes("ISO 13789:2017"), "ISO 13789 reference present");
check(methodology.includes("ISO 52016-1:2017"), "ISO 52016 scope reference present");
check(methodology.includes("ENERGY STAR"), "ENERGY STAR source present");
check(methodology.includes("Known limits"), "Limitations are visible");
check(methodology.includes("versioned"), "Data versioning is explained");
const toolPage = read("src/components/building-envelope/BuildingEnvelopeToolPage.tsx");
check(toolPage.includes('applicationCategory: "DesignApplication"'), "Structured-data application category uses a Google-supported category");
check(!toolPage.includes("<main") && !read("app/building-envelope/page.tsx").includes("<main") && !methodology.includes("<main"), "Building pages avoid nested main landmarks under root layout");

const sitemap = read("app/sitemap.ts");
check(sitemap.includes("/building-envelope/insulation-calculator"), "Insulation route is in sitemap");
check(sitemap.includes("/building-envelope/u-value-calculator"), "U-value route is in sitemap");
check(sitemap.includes("/building-envelope/heat-loss-calculator"), "Heat-loss route is in sitemap");
check(sitemap.includes("/building-envelope/carbon-payback-calculator"), "Carbon-payback route is in sitemap");
check(!sitemap.includes("priority:"), "Sitemap does not use ignored priority hints");
check(!sitemap.includes("changeFrequency:"), "Sitemap does not use ignored changefreq hints");
check(!sitemap.includes("lastModified: new Date"), "Sitemap does not fake lastmod freshness");

const pages = required.filter((p) => p.startsWith("app/building-envelope/") && p.endsWith("page.tsx"));
pages.forEach((page) => {
  const content = read(page);
  check(content.includes("canonical") || page === "app/building-envelope/page.tsx", `${page} declares canonical metadata or hub metadata`);
});

const layout = read("app/layout.tsx");
check(layout.includes("/building-envelope"), "Desktop/footer navigation includes Building Envelope");
check(layout.includes("privacy-policy") && layout.includes("terms-of-service"), "Existing legal routes preserved");
check(layout.includes("solarcalculator.greenengineeringtools.com"), "Solar cross-property link preserved");

const mobile = read("src/components/MobileNav.tsx");
check(mobile.includes("Building Envelope"), "Mobile navigation includes Building Envelope");
check(mobile.includes("overflow = \"hidden\""), "Mobile menu locks background scrolling");
check(mobile.includes("Escape"), "Mobile menu supports Escape key");

console.log(`\n${passed}/${passed} static checks passed.`);
