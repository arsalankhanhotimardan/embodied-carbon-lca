import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Prevent Google from trying to index your raw JSON backend routes
      disallow: ['/api/', '/api/epd', '/api/ec3', '/api/webhook/revit'], 
    },
    sitemap: 'https://greenengineeringtools.com/sitemap.xml',
  };
}