/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three.js ships untranspiled ESM examples; Next handles it, but we keep the
  // heavy 3D deps out of the server bundle where possible.
  transpilePackages: ['three'],
  eslint: { ignoreDuringBuilds: true },

  // Static export so the site can be served from GitHub Pages / any CDN.
  // GitHub Pages lowercases the repo path, so the basePath must be lowercase
  // to match the actual URL (https://farhanlabibahan.github.io/portfolio).
  output: 'export',
  basePath: '/portfolio',
  assetPrefix: '/portfolio/',
};

export default nextConfig;
