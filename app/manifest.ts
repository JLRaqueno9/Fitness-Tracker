import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fitness Test Tracker",
    short_name: "Fitness",
    start_url: "/",
    display: "standalone",
    background_color: "#070e26",
    theme_color: "#13214f",
    icons: [
        { src: "/icon-180.png", sizes: "180x180", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}