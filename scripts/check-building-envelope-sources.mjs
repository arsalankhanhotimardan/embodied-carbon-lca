/**
 * Source-health monitor. It NEVER overwrites production calculation data.
 * Run weekly/monthly in CI. If a source disappears or its key identity marker
 * changes, review the source and release a new validated dataset version.
 */
const sources = [
  { name: "ISO 6946", url: "https://www.iso.org/standard/65708.html", marker: "ISO 6946:2017" },
  { name: "ISO 13789", url: "https://www.iso.org/standard/65713.html", marker: "ISO 13789:2017" },
  { name: "ISO 52016-1", url: "https://www.iso.org/standard/65696.html", marker: "ISO 52016-1:2017" },
  { name: "ENERGY STAR insulation guidance", url: "https://www.energystar.gov/saveathome/seal_insulate/identify-problems-you-want-fix/diy-checks-inspections/insulation-r-values", marker: "Recommended Home Insulation" },
  { name: "Google people-first content guidance", url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content", marker: "people-first" },
  { name: "Google AdSense ad placement policy", url: "https://support.google.com/adsense/answer/1346295?hl=en", marker: "Ad placement" },
];

let failures = 0;
for (const source of sources) {
  try {
    const response = await fetch(source.url, { redirect: "follow", headers: { "user-agent": "GreenEngineeringTools-SourceMonitor/1.0" } });
    const text = await response.text();
    const ok = response.ok && text.toLowerCase().includes(source.marker.toLowerCase());
    console.log(`${ok ? "OK" : "REVIEW"}  ${source.name}  HTTP ${response.status}`);
    if (!ok) failures += 1;
  } catch (error) {
    failures += 1;
    console.log(`REVIEW  ${source.name}  ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures) {
  console.error(`\n${failures} source(s) need review. No production data was changed.`);
  process.exitCode = 2;
} else {
  console.log("\nAll monitored sources are reachable and retain expected identity markers. No production data was changed.");
}
