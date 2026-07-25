/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,

  // 	FIX: Use Docker service name 'api' instead of localhost for production
  // In Docker production: api service is available at 'api:3001'
  // In development: falls back to localhost:3001
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.INTERNAL_API_URL || 'http://api:3001/api/:path*',
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
