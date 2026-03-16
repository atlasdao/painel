import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  experimental: {
    optimizePackageImports: ['lucide-react']
  },

  // Use Turbopack (Next.js 16 default) with empty config to acknowledge webpack coexistence
  turbopack: {},

  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  compress: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://api.fontshare.com https://fonts.googleapis.com; font-src 'self' https://cdn.fontshare.com https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' data: blob: https://api.atlasdao.app https://api.atlasdao.info http://localhost:19997; frame-ancestors 'none'"
          }
        ]
      },
      {
        source: '/(.*)\\.(jpg|jpeg|png|gif|ico|svg|webp|avif)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      },
      {
        source: '/(.*)\\.(woff|woff2|ttf|otf)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      }
    ];
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer/'),
        stream: false,
        crypto: false,
        fs: false,
        path: false,
        os: false,
      };
      config.plugins.push(
        new (require('webpack')).ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        })
      );
      config.experiments = { ...config.experiments, asyncWebAssembly: true };
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          crypto: {
            test: /[\\/]node_modules[\\/](liquidjs-lib|bip32|bip39|tiny-secp256k1|buffer|bitcoinjs-lib|ethers)[\\/]/,
            name: 'wallet-crypto',
            chunks: 'async',
            priority: 20,
          },
          qrscanner: {
            test: /[\\/]node_modules[\\/](html5-qrcode)[\\/]/,
            name: 'qr-scanner',
            chunks: 'async',
            priority: 15,
          },
        },
      };
    }
    return config;
  },
};

export default nextConfig;
