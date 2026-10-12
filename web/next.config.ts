import type { NextConfig } from "next";
import { withSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "supabase.co" },
    ],
  },
};

export default withSecurityHeaders(nextConfig);
