/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ["@visualify/design-system"],
  async redirects() {
    return [
      {
        source: "/hq/workspaces/:workspaceId",
        destination: "/workspaces/:workspaceId",
        permanent: true,
      },
      {
        source: "/hq/workspaces/:workspaceId/:path*",
        destination: "/workspaces/:workspaceId/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
