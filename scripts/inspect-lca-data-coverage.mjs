const BASE_URL = (process.env.LCA_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function json(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${path} -> HTTP ${response.status}`);
  return response.json();
}

try {
  await json("/api/health/lca");
} catch (error) {
  console.error(`Cannot reach ${BASE_URL}. Run npm run dev in another PowerShell window first.`);
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
}

const payload = await json("/api/epd");
const rows = Array.isArray(payload?.data)
  ? payload.data
  : Array.isArray(payload)
  ? payload
  : [];

const controls = [
  ["Concrete", /ready.?mix concrete.*30|30.*mpa/i],
  ["Reinforcing Steel", /reinforcing steel|electrowelded mesh/i],
  ["Structural Steel", /structural steel/i],
  ["Portland Cement", /portland cement|sulfate resisting/i],
  ["Aluminum Extrusion", /aluminum extrusion|aluminium extrusion/i],
  ["Mineral Wool", /mineral wool|sandwich panels.*mw/i],
];

function first(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return null;
}

function moduleGwp(row, module) {
  const modules = row?.modules || {};
  const variants =
    module === "A1A3"
      ? ["A1A3", "A1-A3", "A1_A3", "A1/A3"]
      : [module];

  for (const key of variants) {
    const value = first(
      modules?.[key]?.gwp,
      row?.impacts?.[key]?.gwp,
      row?.lca_modules?.[key]?.gwp
    );
    if (value !== null) return value;
  }

  if (module === "A1A3") {
    return first(row?.gwp_a1a3, row?.gwp_mfg, row?.gwp, row?.phases?.manufacturing);
  }
  if (module === "A5") return first(row?.gwp_a5, row?.gwp_con, row?.phases?.construction);
  if (module === "B1") return first(row?.gwp_b1, row?.gwp_use, row?.phases?.use);
  if (module === "C4") return first(row?.gwp_c4, row?.gwp_eol, row?.phases?.eol);
  return null;
}

console.log(`Loaded ${rows.length} EPD records from ${BASE_URL}/api/epd\n`);

for (const [label, pattern] of controls) {
  const matches = rows.filter((row) =>
    pattern.test(String(row?.material_name || row?.name || row?.product_name || ""))
  );

  console.log(`=== ${label} ===`);

  if (!matches.length) {
    console.log("NOT FOUND\n");
    continue;
  }

  for (const row of matches.slice(0, 3)) {
    const name = row?.material_name || row?.name || row?.product_name || "Unnamed";
    const a1a3 = moduleGwp(row, "A1A3");
    const a5 = moduleGwp(row, "A5");
    const b1 = moduleGwp(row, "B1");
    const c4 = moduleGwp(row, "C4");

    console.log(name);
    console.log(`  source: ${row?.source ?? "N/A"}`);
    console.log(`  declared basis: ${row?.declared_quantity ?? row?.declaredQuantity ?? 1} ${row?.declared_unit ?? row?.declaredUnit ?? row?.unit ?? "N/A"}`);
    console.log(`  A1-A3 GWP: ${a1a3 ?? "N/A"}`);
    console.log(`  A5 GWP: ${a5 ?? "N/A"}`);
    console.log(`  B1 GWP: ${b1 ?? "N/A"}${b1 === 0 || b1 === "0" ? "  <-- explicit zero present in API record" : ""}`);
    console.log(`  C4 GWP: ${c4 ?? "N/A"}`);
    console.log(`  density kg/m3: ${row?.density_kg_m3 ?? row?.densityKgM3 ?? "N/A"}`);
    console.log(`  mass kg/declared unit: ${row?.mass_kg_per_declared_unit ?? row?.massKgPerDeclaredUnit ?? row?.weight_kg_per_unit ?? "N/A"}`);
    console.log("");
  }
}
