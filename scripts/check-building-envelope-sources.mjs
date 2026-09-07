/**
 * Source-health monitor.
 *
 * This script NEVER overwrites production calculation data.
 * It only checks whether authoritative reference pages remain available
 * and retain their expected identity markers.
 *
 * Some publishers, including ISO, may block automated GitHub Actions
 * requests with HTTP 401 or 403. Those responses are recorded as warnings
 * and require manual review, but they do not fail the workflow.
 */

const sources = [
  {
    name: "ISO 6946",
    url: "https://www.iso.org/standard/65708.html",
    marker: "ISO 6946:2017",
    toleratedStatuses: [401, 403],
  },
  {
    name: "ISO 13789",
    url: "https://www.iso.org/standard/65713.html",
    marker: "ISO 13789:2017",
    toleratedStatuses: [401, 403],
  },
  {
    name: "ISO 52016-1",
    url: "https://www.iso.org/standard/65696.html",
    marker: "ISO 52016-1:2017",
    toleratedStatuses: [401, 403],
  },
  {
    name: "ENERGY STAR insulation guidance",
    url: "https://www.energystar.gov/saveathome/seal_insulate/identify-problems-you-want-fix/diy-checks-inspections/insulation-r-values",
    marker: "Recommended Home Insulation",
    toleratedStatuses: [],
  },
  {
    name: "Google people-first content guidance",
    url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    marker: "people-first",
    toleratedStatuses: [],
  },
  {
    name: "Google AdSense ad placement policy",
    url: "https://support.google.com/adsense/answer/1346295?hl=en",
    marker: "Ad placement",
    toleratedStatuses: [],
  },
];

let failures = 0;
let warnings = 0;

for (const source of sources) {
  try {
    const response = await fetch(source.url, {
      redirect: "follow",
      headers: {
        "user-agent": "GreenEngineeringTools-SourceMonitor/1.0",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(20000),
    });

    if (source.toleratedStatuses.includes(response.status)) {
      warnings += 1;

      console.warn(
        `WARNING  ${source.name}  HTTP ${response.status} — automated access blocked; manual review required.`,
      );

      continue;
    }

    if (!response.ok) {
      failures += 1;

      console.error(
        `FAILED  ${source.name}  HTTP ${response.status} — source is unavailable.`,
      );

      continue;
    }

    const pageText = await response.text();

    const markerFound = pageText
      .toLowerCase()
      .includes(source.marker.toLowerCase());

    if (!markerFound) {
      failures += 1;

      console.error(
        `REVIEW  ${source.name}  HTTP ${response.status} — expected marker "${source.marker}" was not found.`,
      );

      continue;
    }

    console.log(`OK  ${source.name}  HTTP ${response.status}`);
  } catch (error) {
    failures += 1;

    const message =
      error instanceof Error ? error.message : String(error);

    console.error(`FAILED  ${source.name}  ${message}`);
  }
}

console.log("");

if (failures > 0) {
  console.error(
    `${failures} source(s) failed validation. ${warnings} warning(s) recorded. No production data was changed.`,
  );

  process.exitCode = 2;
} else if (warnings > 0) {
  console.warn(
    `Monitoring completed with ${warnings} warning(s). Blocked sources require occasional manual review. No production data was changed.`,
  );
} else {
  console.log(
    "All monitored sources are reachable and retain their expected identity markers. No production data was changed.",
  );
}