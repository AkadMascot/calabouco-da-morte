/** @type {import('next').NextConfig} */
const isProd = process.env.GITHUB_ACTIONS === 'true';

const nextConfig = {
  output: 'export',
  ...(isProd ? {
    basePath: '/calabouco-da-morte',
    assetPrefix: '/calabouco-da-morte/',
  } : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
