import type { MetadataRoute } from "next";

// Installable customer dashboard for quick mobile campaign checks.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ReplyHalo",
    short_name: "ReplyHalo",
    description: "Instagram comment-to-DM automation",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#18181b",
    theme_color: "#18181b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
