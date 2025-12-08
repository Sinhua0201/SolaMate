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
      };
    }
    return config;
  },
};

export default nextConfig;
