import type { MetadataRoute } from "next";
import { VISUALIFY_APP_LAUNCH_CANVAS, VISUALIFY_APP_LAUNCH_MANIFEST_BACKGROUND } from "@visualify/app-shell";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Report",
    short_name: "Report",
    description: "Visualify Report — standalone reporting product",
    start_url: "/home",
    display: "standalone",
    theme_color: VISUALIFY_APP_LAUNCH_CANVAS,
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
