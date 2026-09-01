import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://greenengineeringtools.com";

  // Last major CBAM calculator update.
  // Update this date only when these pages receive meaningful changes.
  const cbamUpdated = new Date("2026-09-01T00:00:00Z");

  return [
    // =========================================================
    // HOME
    // =========================================================
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1.0,
    },

    // =========================================================
    // CBAM TOOLS
    // =========================================================
    {
      url: `${baseUrl}/cbam-calculator`,
      lastModified: cbamUpdated,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/cbam-calculator/actual-data`,
      lastModified: cbamUpdated,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/cbam-calculator/electricity`,
      lastModified: cbamUpdated,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/cbam-calculator/bulk`,
      lastModified: cbamUpdated,
      changeFrequency: "weekly",
      priority: 0.9,
    },

    // =========================================================
    // LCA / EMBODIED CARBON TOOL
    // =========================================================
    {
      url: `${baseUrl}/embodied-carbon-calculator`,
      changeFrequency: "weekly",
      priority: 1.0,
    },

    // =========================================================
    // EDUCATIONAL / SEO CONTENT
    // =========================================================
    {
      url: `${baseUrl}/guides`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/methodology`,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/a1-a3-embodied-carbon`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/epd-carbon-calculator`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ec3-epd-guide`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/bim-embodied-carbon`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/whole-building-lca`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/module-d-lca`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/leed-whole-building-lca`,
      changeFrequency: "monthly",
      priority: 0.8,
    },

    // =========================================================
    // COMPANY / TRUST
    // =========================================================
    {
      url: `${baseUrl}/about`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      changeFrequency: "monthly",
      priority: 0.6,
    },

    // =========================================================
    // LEGAL
    // =========================================================
    {
      url: `${baseUrl}/privacy-policy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}