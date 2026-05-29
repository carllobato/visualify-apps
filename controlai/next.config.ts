import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

/** ControlAI package root (`next` lives in `./node_modules` — Turbopack must not use `app/` as root). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@visualify/design-system", "@visualify/app-shell"],
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
