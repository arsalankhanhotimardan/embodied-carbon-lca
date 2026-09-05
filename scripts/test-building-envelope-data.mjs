import assert from "node:assert/strict";
import { ENVELOPE_MATERIALS, ENVELOPE_MATERIAL_DATASET_VERSION } from "../src/data/building-envelope/materials.v1.ts";
import { US_ENERGY_STAR_RETROFIT_ZONES, REGIONAL_GUIDANCE_DATASET_VERSION } from "../src/data/building-envelope/regional-guidance.v1.ts";

let passed = 0;
const check = (condition, label) => { assert.ok(condition, label); passed += 1; console.log(`✓ ${label}`); };

check(/^\d{4}\.\d{2}\.\d+$/.test(ENVELOPE_MATERIAL_DATASET_VERSION), "Material dataset has semantic date version");
check(/^\d{4}\.\d{2}\.\d+$/.test(REGIONAL_GUIDANCE_DATASET_VERSION), "Guidance dataset has semantic date version");
check(ENVELOPE_MATERIALS.length >= 10, "Material library contains a useful initial set");
check(new Set(ENVELOPE_MATERIALS.map((m) => m.id)).size === ENVELOPE_MATERIALS.length, "Material IDs are unique");
check(ENVELOPE_MATERIALS.every((m) => m.conductivityWmK > 0 && Number.isFinite(m.conductivityWmK)), "Every material has valid positive conductivity");
check(ENVELOPE_MATERIALS.every((m) => !m.densityKgM3 || m.densityKgM3 > 0), "Optional densities are positive");
check(ENVELOPE_MATERIALS.every((m) => m.note.toLowerCase().includes("planning") || m.note.toLowerCase().includes("product") || m.note.toLowerCase().includes("manufacturer") || m.note.toLowerCase().includes("declared")), "Material notes communicate planning/product caveats");
check(US_ENERGY_STAR_RETROFIT_ZONES.length === 6, "ENERGY STAR grouped climate-zone rows present");
check(US_ENERGY_STAR_RETROFIT_ZONES.every((z) => z.atticBareRUs > 0 && z.atticExisting34InRUs > 0 && z.floorRUs > 0), "Regional R-value guidance is positive");
check(US_ENERGY_STAR_RETROFIT_ZONES.every((z) => z.atticBareRUs >= z.atticExisting34InRUs), "Bare-attic target is not below top-up target");

console.log(`\n${passed}/${passed} dataset checks passed.`);
