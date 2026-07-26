import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://202.133.91.13';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/admin/', '/auth/', '/checkout/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
