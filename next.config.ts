import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["firebase-admin"],
  turbopack: {
    root: "/Users/home/Downloads/qrsystem",
  },
};

export default nextConfig;
