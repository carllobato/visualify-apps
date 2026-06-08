import type { MetadataRoute } from "next";
import { VISUALIFY_APP_LAUNCH_MANIFEST_BACKGROUND } from "@visualify/app-shell";
import { REPORT_DEFAULT_ROUTE } from "@/lib/report-routes";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Report",
    short_name: "Report",
    description: "Visualify Report — standalone reporting product",
    start_url: REPORT_DEFAULT_ROUTE,
    // Standalone home-screen app so content renders edge-to-edge behind the notch/status bar.
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
