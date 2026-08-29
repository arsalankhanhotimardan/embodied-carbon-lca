import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://greenengineeringtools.com';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0, // Tells Google this is the most critical page to index
    },
    // As you expand your SaaS and build out dedicated programmatic SEO pages,
    // you will add those route objects here. Example:
    // {
    //   url: `${baseUrl}/methodology`,
    //   lastModified: new Date(),
    //   changeFrequency: 'monthly',
    //   priority: 0.8,
    // },
  ];
}