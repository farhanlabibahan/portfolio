/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three.js ships untranspiled ESM examples; Next handles it, but we keep the
  // heavy 3D deps out of the server bundle where possible.
  transpilePackages: ['three'],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
