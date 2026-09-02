const BASE_URL = (process.env.LCA_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const searches = [
  ["Concrete", "ready mix concrete 30 MPa"],
  ["Reinforcing Steel", "reinforcing steel"],
  ["Portland Cement", "portland cement"],
  ["Aluminum Extrusion", "aluminum extrusion"],
  ["Mineral Wool", "mineral wool"],
];

async function json(path) {
  const response = await fetch(`${BASE_URL}${path}`, {
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return { response, body };
}

console.log(`Testing LCA V2.4 EC3/openEPD pipeline at ${BASE_URL}\n`);

const health = await json("/api/health/lca");
console.log(`/api/health/lca -> HTTP ${health.response.status}`);

if (![200, 503].includes(health.response.status)) {
  console.error("The LCA backend health route is not available.");
  process.exit(2);
}

let failures = 0;

for (const [label, query] of searches) {
  console.log(`\n=== ${label} ===`);

  const search = await json(`/api/ec3?search=${encodeURIComponent(query)}`);

  if (!search.response.ok) {
    failures++;
    console.log(`Search failed: HTTP ${search.response.status}`);
    console.log(search.body);
    continue;
  }

  const rows = Array.isArray(search.body?.data) ? search.body.data : [];
  console.log(`Search results: ${rows.length}`);

  if (!rows.length) {
    failures++;
    console.log("No EC3 results.");
    continue;
  }

  const candidate =
    rows.find((row) => row?.open_xpd_uuid) ||
    rows.find((row) => row?.id && !String(row.id).startsWith("ec3-search-")) ||
    rows[0];

  console.log(`Selected: ${candidate?.name || candidate?.product_name || "Unnamed"}`);
  console.log(`id: ${candidate?.id || "N/A"}`);
  console.log(`open_xpd_uuid: ${candidate?.open_xpd_uuid || "N/A"}`);
  console.log(`search A1-A3 GWP: ${candidate?.modules?.A1A3?.gwp ?? "N/A"}`);

  if (!candidate?.id || String(candidate.id).startsWith("ec3-search-")) {
    console.log("No usable detail identifier was exposed by this search result.");
    continue;
  }

  const detail = await json(`/api/ec3?id=${encodeURIComponent(candidate.id)}`);

  console.log(`detail -> HTTP ${detail.response.status}`);

  if (!detail.response.ok) {
    failures++;
    console.log(detail.body);
    continue;
  }

  const data = detail.body?.data || {};
  console.log(`LCIA method: ${detail.body?.lciaMethod ?? data?.metadata?.lcia_method ?? "N/A"}`);
  console.log(`Declared basis: ${data?.declared_quantity ?? 1} ${data?.declared_unit ?? "N/A"}`);
  console.log(`Module keys: ${Object.keys(data?.modules || {}).join(", ") || "NONE"}`);
  console.log(`detail A1-A3 GWP: ${data?.modules?.A1A3?.gwp ?? "N/A"}`);
  console.log(`A4 GWP: ${data?.modules?.A4?.gwp ?? "N/A"}`);
  console.log(`A5 GWP: ${data?.modules?.A5?.gwp ?? "N/A"}`);
  console.log(`B1 GWP: ${data?.modules?.B1?.gwp ?? "N/A"}`);
  console.log(`C4 GWP: ${data?.modules?.C4?.gwp ?? "N/A"}`);
}

console.log("\n----------------------------------------");
if (failures) {
  console.log(`Pipeline test completed with ${failures} item(s) needing review.`);
  process.exitCode = 1;
} else {
  console.log("Pipeline test completed without HTTP/detail failures.");
}
console.log("This script performs READS only. It does not modify the database.");
