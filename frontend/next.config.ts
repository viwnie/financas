import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: false,
  transpilePackages: ['@radix-ui/react-avatar'],
};

export default nextConfig;
