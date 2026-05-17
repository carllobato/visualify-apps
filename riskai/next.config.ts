import type { NextConfig } from "next";

const contentSecurityPolicy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';";

const nextConfig: NextConfig = {
  transpilePackages: ["@visualify/design-system", "@visualify/app-shell"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/riskai",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/riskai/:path*",
        destination: "/:path*",
        permanent: true,
      },
      {
        source: "/run-data/:path*",
        destination: "/dev/run-data/:path*",
        permanent: true,
      },
      {
        source: "/run-data",
        destination: "/dev/run-data",
        permanent: true,
      },
      {
        source: "/project-not-found/:path*",
        destination: "/not-found/:path*",
        permanent: true,
      },
      {
        source: "/project-not-found",
        destination: "/not-found",
        permanent: true,
      },
      {
        source: "/portfolios/:portfolioId/settings",
        destination: "/portfolios/:portfolioId/portfolio-settings",
        permanent: true,
      },
      {
        source: "/portfolios/:portfolioId/admin",
        destination: "/portfolios/:portfolioId/portfolio-settings",
        permanent: true,
      },
      {
        source: "/settings",
        destination: "/account",
        permanent: true,
      },
      {
        source: "/projects/:projectId/setup",
        destination: "/projects/:projectId/settings",
        permanent: true,
      },
      {
        source: "/projects/:projectId/project-home",
        destination: "/projects/:projectId",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
