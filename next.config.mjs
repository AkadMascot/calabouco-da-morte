/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/calabouco-da-morte',
  assetPrefix: '/calabouco-da-morte/',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
