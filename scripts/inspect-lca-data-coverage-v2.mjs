const BASE_URL = (process.env.LCA_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

async function requestJson(path, { required = true } = {}) {
  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(
      `Network connection failed for ${BASE_URL}${path}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!response.ok) {
    if (!required) {
      return {
        ok: false,
        status: response.status,
        data: null,
      };
    }

    const body = await response.text().catch(() => "");
    throw new Error(
      `${path} -> HTTP ${response.status}${body ? `\n${body.slice(0, 500)}` : ""}`
    );
  }

  const data = await response.json();

  return {
    ok: true,
    status: response.status,
    data,
  };
}

// Optional health route.
// A 404 here does NOT mean the Next.js server is unreachable.
try {
  const health = await requestJson("/api/health/lca", { required: false });

  if (health.ok) {
    console.log(`Health endpoint: OK (${health.status})`);
  } else {
    console.log(
      `Health endpoint: not available (HTTP ${health.status}) — continuing with /api/epd.`
    );
  }
} catch (error) {
  console.error(`Cannot connect to ${BASE_URL}.`);
  console.error("Run `npm run dev` in another PowerShell window first.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
}

let epdPayload;

try {
  const result = await requestJson("/api/epd");
  epdPayload = result.data;
  console.log(`EPD endpoint: OK (${result.status})\n`);
} catch (error) {
  console.error("The Next.js server responded, but /api/epd could not be read.");
  console.error(error instanceof Error ? error.message : error);
  console.error("\nCheck that this project contains:");
  console.error("  app/api/epd/route.ts");
  process.exit(3);
}

const rows = Array.isArray(epdPayload?.data)
  ? epdPayload.data
  : Array.isArray(epdPayload)
  ? epdPayload
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
  const impacts = row?.impacts || {};
  const lcaModules = row?.lca_modules || {};

  const variants =
    module === "A1A3"
      ? ["A1A3", "A1-A3", "A1_A3", "A1/A3"]
      : [module];

  for (const key of variants) {
    const value = first(
      modules?.[key]?.gwp,
      impacts?.[key]?.gwp,
      lcaModules?.[key]?.gwp
    );

    if (value !== null) return value;
  }

  if (module === "A1A3") {
    return first(
      row?.gwp_a1a3,
      row?.gwp_mfg,
      row?.gwp,
      row?.phases?.manufacturing
    );
  }

  if (module === "A5") {
    return first(row?.gwp_a5, row?.gwp_con, row?.phases?.construction);
  }

  if (module === "B1") {
    return first(row?.gwp_b1, row?.gwp_use, row?.phases?.use);
  }

  if (module === "C4") {
    return first(row?.gwp_c4, row?.gwp_eol, row?.phases?.eol);
  }

  return null;
}

console.log(`Loaded ${rows.length} EPD records from ${BASE_URL}/api/epd\n`);

for (const [label, pattern] of controls) {
  const matches = rows.filter((row) =>
    pattern.test(
      String(
        row?.material_name ||
          row?.name ||
          row?.product_name ||
          ""
      )
    )
  );

  console.log(`=== ${label} ===`);

  if (!matches.length) {
    console.log("NOT FOUND\n");
    continue;
  }

  for (const row of matches.slice(0, 3)) {
    const name =
      row?.material_name ||
      row?.name ||
      row?.product_name ||
      "Unnamed";

    const a1a3 = moduleGwp(row, "A1A3");
    const a5 = moduleGwp(row, "A5");
    const b1 = moduleGwp(row, "B1");
    const c4 = moduleGwp(row, "C4");

    console.log(name);
    console.log(`  id: ${row?.id ?? row?.epd_id ?? row?.uuid ?? "N/A"}`);
    console.log(`  source: ${row?.source ?? "N/A"}`);
    console.log(
      `  declared basis: ${
        row?.declared_quantity ??
        row?.declaredQuantity ??
        row?.reference_quantity ??
        1
      } ${
        row?.declared_unit ??
        row?.declaredUnit ??
        row?.unit ??
        "N/A"
      }`
    );
    console.log(`  A1-A3 GWP: ${a1a3 ?? "N/A"}`);
    console.log(`  A5 GWP: ${a5 ?? "N/A"}`);
    console.log(
      `  B1 GWP: ${b1 ?? "N/A"}${
        b1 === 0 || b1 === "0"
          ? "  <-- explicit zero present in API record"
          : ""
      }`
    );
    console.log(`  C4 GWP: ${c4 ?? "N/A"}`);
    console.log(
      `  density kg/m3: ${
        row?.density_kg_m3 ??
        row?.densityKgM3 ??
        row?.density ??
        "N/A"
      }`
    );
    console.log(
      `  mass kg/declared unit: ${
        row?.mass_kg_per_declared_unit ??
        row?.massKgPerDeclaredUnit ??
        row?.weight_kg_per_unit ??
        "N/A"
      }`
    );

    const moduleKeys =
      row?.modules && typeof row.modules === "object"
        ? Object.keys(row.modules)
        : [];

    console.log(
      `  module keys: ${moduleKeys.length ? moduleKeys.join(", ") : "NONE"}`
    );
    console.log("");
  }
}
