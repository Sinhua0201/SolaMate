/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use webpack instead of turbopack for compatibility
  experimental: {
    turbo: false,
  },
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Fix for MetaMask SDK React Native dependencies
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        // Fix for Solana Web3.js Buffer issues
        'buffer': require.resolve('buffer/'),
        'stream': require.resolve('stream-browserify'),
        'crypto': require.resolve('crypto-browserify'),
      };

      // Add Buffer polyfill
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }
    return config;
  },
};

export default nextConfig;
