/** @type {import('next').NextConfig} */
const nextConfig = {
  // Existing configuration
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://10.10.15.194:3000"
  ],

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Compiler optimizations
  compiler: {
    // Remove console.log in production (keeps console.error and console.warn)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Experimental performance features
  experimental: {
    // Optimize CSS loading
    optimizeCss: true,
    // Optimize package imports - tree shake these large packages
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
      'recharts',
    ],
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations only
    if (!dev && !isServer) {
      // Enable module concatenation for smaller bundles
      config.optimization.concatenateModules = true
    }
    return config
  },

  // Enable gzip compression headers
  compress: true,

  // Power performance with aggressive caching
  headers: async () => {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },

  // Reduce build output noise
  productionBrowserSourceMaps: false,
};

export default nextConfig;