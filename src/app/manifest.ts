import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Math Quest",
    short_name: "Math Quest",
    description: "Aventuras y clases de matemáticas para aprender en familia.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      { src: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/app-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
