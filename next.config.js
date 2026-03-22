/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, path: false, crypto: false, os: false,
        'onnxruntime-node': false,
        'events': require.resolve('events/'),
      };
    }
    // Handle onnxruntime-node as external on server
    if (isServer) {
      config.externals = [...(config.externals || []), 'onnxruntime-node'];
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['onnxruntime-node'],
  },
};

module.exports = nextConfig;
