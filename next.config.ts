import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // An unrelated package-lock.json in the home directory otherwise makes
  // Turbopack infer that as the workspace root and refuse to resolve files
  // in this project.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
