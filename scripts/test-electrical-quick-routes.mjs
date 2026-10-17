#!/usr/bin/env node
/**
 * Guard: every quick electrical converter in src/data/electrical-quick-tools.ts must have its
 * OWN route folder app/electrical/<slug>/page.tsx, and there must be no app/electrical/[slug] route.
 * A [slug] route 404s on the Cloudflare (OpenNext) deployment, so adding a converter to the data
 * file without adding its folder would ship a dead link.
 *
 *   node scripts/test-electrical-quick-routes.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const data = fs.readFileSync(path.join(root, "src/data/electrical-quick-tools.ts"), "utf8");
const slugs = [...data.matchAll(/^\s+slug: "([a-z0-9-]+)",/gm)].map((m) => m[1]);

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error("FAIL:", msg);
};

if (slugs.length === 0) fail("no slugs found in the data file");
if (new Set(slugs).size !== slugs.length) fail("duplicate slugs in the data file");

for (const slug of slugs) {
  const file = path.join(root, "app/electrical", slug, "page.tsx");
  if (!fs.existsSync(file)) {
    fail(`missing route app/electrical/${slug}/page.tsx`);
    continue;
  }
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(`const SLUG = "${slug}"`)) fail(`${slug}: SLUG constant does not match its folder`);
  if (!text.includes("QuickElectricalPage")) fail(`${slug}: page does not render QuickElectricalPage`);
}

if (fs.existsSync(path.join(root, "app/electrical/[slug]"))) fail("app/electrical/[slug] must not exist (404s on Cloudflare)");

if (failures) {
  console.error(`\n${failures} problem(s).`);
  process.exit(1);
}
console.log(`OK: ${slugs.length} converters each have their own route folder; no [slug] route.`);
