import fs from "node:fs";

const required = [
  "src/lib/electrical-engine.ts",
  "src/components/electrical/ElectricalDesigner.tsx",
  "src/components/electrical/ElectricalToolPage.tsx",
  "src/components/electrical/PowerConverter.tsx",
  "src/components/MobileNav.tsx",
  "app/electrical/page.tsx",
  "app/electrical/voltage-drop-calculator/page.tsx",
  "app/electrical/wire-size-calculator/page.tsx",
  "app/electrical/wire-length-calculator/page.tsx",
  "app/electrical/dc-wire-size-calculator/page.tsx",
  "app/electrical/3-phase-voltage-drop-calculator/page.tsx",
  "app/electrical/battery-cable-size-calculator/page.tsx",
  "app/electrical/cable-power-loss-calculator/page.tsx",
  "app/electrical/watts-to-amps-calculator/page.tsx",
  "app/electrical/kva-to-amps-calculator/page.tsx",
  "app/electrical/methodology/page.tsx",
  "app/layout.tsx",
  "app/sitemap.ts",
  "app/robots.ts",
];

let passed = 0;
let failed = 0;
const check = (condition, message) => {
  const ok = Boolean(condition);
  console.log(`${ok ? "PASS" : "FAIL"} ${message}`);
  ok ? passed++ : failed++;
};

for (const file of required) check(fs.existsSync(file), `exists: ${file}`);

const engine = fs.readFileSync("src/lib/electrical-engine.ts", "utf8");
const designer = fs.readFileSync("src/components/electrical/ElectricalDesigner.tsx", "utf8");
const layout = fs.readFileSync("app/layout.tsx", "utf8");
const mobileNav = fs.readFileSync("src/components/MobileNav.tsx", "utf8");
const sitemap = fs.readFileSync("app/sitemap.ts", "utf8");
const methodology = fs.readFileSync("app/electrical/methodology/page.tsx", "utf8");

check(engine.includes('"wire-size"') && engine.includes('"max-length"') && engine.includes('"max-current"'), "engine includes forward and reverse solve modes");
check(engine.includes("Math.sqrt(3)") && engine.includes("reactanceOhmPerKm"), "engine includes balanced three-phase and R/X model");
check(engine.includes("rho20OhmMm2PerM") && engine.includes("alpha20PerC"), "temperature-aware conductor resistance model exists");
check(engine.includes("annualLossKWh") && engine.includes("annualLossCost"), "annual energy and cost loss model exists");
check(engine.includes("No thermal ampacity") && engine.includes("does not invent a universal ampacity table"), "engine fails safely on missing ampacity");
check(designer.includes("localStorage") && designer.includes("Copy share link") && designer.includes("Print / save PDF"), "anonymous autosave, share and printable output exist");
check(designer.includes("scrollIntoView") && designer.includes("scroll-mt-24"), "mobile result scrolling exists");
check(layout.includes('href="/electrical"') && layout.includes("solarcalculator.greenengineeringtools.com"), "global navigation exposes electrical and solar ecosystems");
check(mobileNav.includes("usePathname") && mobileNav.includes("[pathname]"), "mobile navigation closes on route changes");
check(mobileNav.includes('event.key === "Escape"') && mobileNav.includes('document.body.style.overflow = "hidden"'), "mobile menu supports Escape and body scroll lock");
check(mobileNav.includes('aria-label="Close navigation menu"') && mobileNav.includes("fixed inset-x-0 bottom-0"), "mobile menu includes an accessible backdrop close target");
check(!layout.includes('alternates: {\n    canonical: "/"'), "root layout does not force every page canonical to home");
check(layout.includes('href="/terms-of-service"'), "legal route uses terms-of-service");
check(sitemap.includes("/electrical/voltage-drop-calculator") && sitemap.includes("/terms-of-service"), "sitemap includes electrical and correct legal routes");
check(!sitemap.includes("priority:") && !sitemap.includes("changeFrequency:"), "sitemap avoids ignored priority/changeFrequency fields");
check(methodology.includes("NIST") && methodology.includes("ABB") && methodology.includes("Schneider"), "methodology includes external engineering references");
check(methodology.includes("Not a code-compliance certificate"), "responsible-use boundary is explicit");

console.log(`\n${passed}/${passed + failed} static checks passed.`);
if (failed) process.exit(1);
