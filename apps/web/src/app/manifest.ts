import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ZugChess",
    short_name: "ZugChess",
    description: "Apprends, comprends et joue toutes les finales d'échecs.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0E12",
    theme_color: "#0A0E12",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
