import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "GeoLearner — Apprendre la géographie",
    short_name: "GeoLearner",
    description: "Ton espace personnel pour apprendre la géographie.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f6f8f4",
    theme_color: "#f6f8f4",
    lang: "fr",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
