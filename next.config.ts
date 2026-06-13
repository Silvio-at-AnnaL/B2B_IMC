import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.replit.dev", "*.repl.co"],
  // robots.txt und llms.txt werden dynamisch aus der DB bedient (siehe src/app/robots.txt/route.ts)
};

export default nextConfig;
