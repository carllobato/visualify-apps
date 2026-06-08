import type { MetadataRoute } from "next";
import { VISUALIFY_APP_LAUNCH_MANIFEST_BACKGROUND } from "@visualify/app-shell";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Visualify OS",
    short_name: "OS",
    description: "Visualify OS — personal operating system",
    start_url: "/today",
    display: "standalone",
    theme_color: VISUALIFY_APP_LAUNCH_MANIFEST_BACKGROUND,
    background_color: VISUALIFY_APP_LAUNCH_MANIFEST_BACKGROUND,
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-1024x1024.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}
