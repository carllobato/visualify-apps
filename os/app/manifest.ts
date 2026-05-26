import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Visualify OS",
    short_name: "OS",
    description: "Visualify OS — personal operating system",
    start_url: "/today",
    display: "standalone",
    theme_color: "#f7f9fc",
    background_color: "#ffffff",
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
      },
    ],
  };
}
