import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
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
  return paths.map((path) => ({ url: `${base}${path}` }));
}
