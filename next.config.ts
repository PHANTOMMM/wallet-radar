import type { NextConfig } from "next";
// EXPORT=1 is only for the sandbox screenshot test (static export has no API route).
const nextConfig: NextConfig = process.env.EXPORT ? { output: "export" } : {};
export default nextConfig;
