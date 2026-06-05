import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin({
  experimental: {
    //Uncommon and add localization json for declaring message Declaration if is needed
    createMessagesDeclaration: ["./messages/bg.json", "./messages/en.json"],
  },
});

const nextConfig: NextConfig = {
  output: "standalone",
  cacheMaxMemorySize: 0,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "", // leave empty for default ports
        pathname: "/**", // allows all paths
      },
    ],
  },
};

export default withNextIntl(nextConfig);
