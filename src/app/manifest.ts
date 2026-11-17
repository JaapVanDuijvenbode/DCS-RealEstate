import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LayeredCake MOVE",
    short_name: "MOVE",
    description: "Verhuizing en verbouwing Nieuwe Rijn 98",
    start_url: "/",
    display: "standalone",
    background_color: "#fff6ee",
    theme_color: "#c23b4b",
    lang: "nl",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
