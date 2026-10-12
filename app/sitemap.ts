import type { MetadataRoute } from "next";

import { QUICK_TOOLS } from "@/data/electrical-quick-tools";
import { countrySlug, listCnCodes, listCountries, safely } from "@/lib/cbam-public-reference";

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://greenengineeringtools.com";
  const paths = [
    "/",
    "/cbam-calculator",
    "/cbam-calculator/actual-data",
    "/cbam-calculator/electricity",
    "/cbam-calculator/bulk",
    "/embodied-carbon-calculator",
    "/guides",
    "/methodology",
    "/a1-a3-embodied-carbon",
    "/epd-carbon-calculator",
    "/ec3-epd-guide",
    "/bim-embodied-carbon",
    "/whole-building-lca",
    "/module-d-lca",
    "/leed-whole-building-lca",
    "/about",
    "/contact",
    "/privacy-policy",
    "/terms-of-service",
    "/electrical",
    "/electrical/voltage-drop-calculator",
    "/electrical/wire-size-calculator",
    "/electrical/wire-length-calculator",
    "/electrical/dc-wire-size-calculator",
    "/electrical/3-phase-voltage-drop-calculator",
    "/electrical/battery-cable-size-calculator",
    "/electrical/cable-power-loss-calculator",
    "/electrical/watts-to-amps-calculator",
    "/electrical/kva-to-amps-calculator",
    "/electrical/methodology",
    "/building-envelope",
    "/building-envelope/insulation-calculator",
    "/building-envelope/attic-insulation-calculator",
    "/building-envelope/blown-in-insulation-calculator",
    "/building-envelope/wall-insulation-calculator",
    "/building-envelope/r-value-calculator",
    "/building-envelope/u-value-calculator",
    "/building-envelope/heat-loss-calculator",
    "/building-envelope/carbon-payback-calculator",
    "/building-envelope/methodology",
  ];
  // Country and CN-code pages come from the database; if it is unreachable at build time they are simply omitted.
  const countries = await safely(listCountries, []);
  const cnCodes = await safely(listCnCodes, []);
  const dataPaths = [
    ...(countries.length ? ["/cbam/country"] : []),
    ...countries.map((c) => `/cbam/country/${countrySlug(c.normalized)}`),
    ...(cnCodes.length ? ["/cbam/cn"] : []),
    ...cnCodes.map((c) => `/cbam/cn/${c.digits}`),
  ];
  const cbamPaths = [
    "/cbam",
    "/cbam/certificate-price",
    "/cbam/do-i-need-cbam",
    "/cbam/cn-code-lookup",
    "/cbam/deadlines",
  ];
  const toolPaths = ["/house-carbon-footprint-calculator"];
  const quickElectrical = QUICK_TOOLS.map((t) => `/electrical/${t.slug}`);
  return [...paths, ...cbamPaths, ...dataPaths, ...quickElectrical, ...toolPaths].map((path) => ({
    url: `${base}${path}`,
    ...(path.startsWith("/cbam/") || path === "/cbam" || quickElectrical.includes(path) || dataPaths.includes(path) || toolPaths.includes(path) ? { lastModified: new Date("2026-10-12") } : {}),
  }));
}
