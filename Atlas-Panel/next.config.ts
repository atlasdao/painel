import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disable strict mode to prevent double mounting
  experimental: {
    optimizePackageImports: ['lucide-react']
  },

  // Otimizacoes de performance e Core Web Vitals
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 dias de cache
  },

  // Compressao e headers de cache
  compress: true,

  // Headers de seguranca e performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          }
        ]
      },
      {
        // Cache de assets estaticos
        source: '/(.*)\\.(jpg|jpeg|png|gif|ico|svg|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        // Cache de fontes
        source: '/(.*)\\.(woff|woff2|ttf|otf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
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
      // Separate crypto libs into async chunks
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          crypto: {
            test: /[\\/]node_modules[\\/](liquidjs-lib|bip32|bip39|tiny-secp256k1|buffer)[\\/]/,
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
