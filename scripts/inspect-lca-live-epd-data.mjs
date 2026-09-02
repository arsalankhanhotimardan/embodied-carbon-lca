const BASE_URL = (process.env.LCA_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function getJson(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }
  return response.json();
}

try {
  await getJson("/api/health/lca");
} catch (error) {
  console.error(`Cannot reach a working LCA server at ${BASE_URL}.`);
  console.error("Run `npm run dev` in another PowerShell window first.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
}

const epdJson = await getJson("/api/epd");
const rows = Array.isArray(epdJson?.data)
  ? epdJson.data
  : Array.isArray(epdJson)
  ? epdJson
  : [];

const controls = [
  "Ready-mix concrete - 30 MPa",
  "Cold-rolled reinforcing steel and electrowelded mesh",
  "Structural Steel",
  "S-P-03615 Sulfate Resisting Portland Cement",
  "Mill Finish Aluminum Extrusion",
  "Sandwich panels with MW",
];

console.log(`Loaded ${rows.length} EPD/database records.\n`);

for (const control of controls) {
  const needle = control.toLowerCase();
  const matches = rows.filter((row) =>
    String(row?.material_name || row?.name || "")
      .toLowerCase()
      .includes(needle)
  );

  if (!matches.length) {
    console.log(`NOT FOUND  ${control}`);
    continue;
  }

  for (const row of matches.slice(0, 3)) {
    const modules = row?.modules && typeof row.modules === "object" ? row.modules : {};
    const a1a3 =
      modules?.A1A3?.gwp ??
      modules?.["A1-A3"]?.gwp ??
      row?.gwp_mfg ??
      row?.gwp_a1a3 ??
      row?.gwp ??
      null;

    console.log(`FOUND      ${row.material_name || row.name}`);
    console.log(`  source: ${row.source ?? "N/A"}`);
    console.log(`  declared basis: ${row.declared_quantity ?? 1} ${row.declared_unit ?? "N/A"}`);
    console.log(`  A1-A3 GWP: ${a1a3 ?? "N/A"}`);
    console.log(`  density kg/m3: ${row.density_kg_m3 ?? "N/A"}`);
    console.log(`  mass kg/declared unit: ${row.mass_kg_per_declared_unit ?? row.weight_kg_per_unit ?? "N/A"}`);
    console.log("");
  }
}
