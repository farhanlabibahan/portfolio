/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three.js ships untranspiled ESM examples; Next handles it, but we keep the
  // heavy 3D deps out of the server bundle where possible.
  transpilePackages: ['three'],
  eslint: { ignoreDuringBuilds: true },

  // Static export so the site can be served from GitHub Pages / any CDN.
  // `basePath` matches this repo's Pages URL (https://farhanlabibahan.github.io/Portfolio).
  output: 'export',
  basePath: '/Portfolio',
  assetPrefix: '/Portfolio/',
};

export default nextConfig;
