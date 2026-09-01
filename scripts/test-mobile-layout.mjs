import fs from "node:fs";

const layout = fs.readFileSync("app/layout.tsx", "utf8");
const nav = fs.readFileSync("src/components/MobileNav.tsx", "utf8");

const checks = [
  ["layout imports MobileNav", layout.includes('import MobileNav from "@/components/MobileNav"')],
  ["mobile overflow protection", layout.includes("overflow-x-hidden") && layout.includes("overflow-x-clip")],
  ["correct Terms route", layout.includes('href="/terms-of-service"') && !layout.includes('href="/terms"')],
  ["mobile menu is client component", nav.includes('"use client"')],
  ["menu closes on link click", nav.includes("onClick={closeMenu}")],
  ["menu closes on route change", nav.includes("[pathname]")],
  ["menu closes with Escape", nav.includes('event.key === "Escape"')],
  ["menu backdrop closes menu", nav.includes('aria-label="Close navigation menu"')],
  ["CBAM actual link", nav.includes('href: "/cbam-calculator/actual-data"')],
  ["CBAM electricity link", nav.includes('href: "/cbam-calculator/electricity"')],
  ["CBAM bulk link", nav.includes('href: "/cbam-calculator/bulk"')],
  ["accessible expanded state", nav.includes("aria-expanded={open}")],
];

let passed = 0;
for (const [name, ok] of checks) {
  if (ok) {
    console.log(`PASS ${name}`);
    passed += 1;
  } else {
    console.log(`FAIL ${name}`);
  }
}

if (passed !== checks.length) {
  console.error(`\n${passed}/${checks.length} checks passed.`);
  process.exit(1);
}

console.log(`\nPASS — ${passed}/${checks.length} mobile layout checks passed.`);
