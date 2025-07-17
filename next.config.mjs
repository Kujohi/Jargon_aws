/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Enable standalone output for Docker
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        dns: false,
        pg: false,
        'pg-native': false,
      };
      
      // Exclude server-only packages entirely
      config.externals = config.externals || [];
      config.externals.push({
        'pg': 'commonjs pg',
        'dns': 'commonjs dns'
      });
    }
    return config;
  },
};

export default nextConfig;
