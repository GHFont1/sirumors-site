import type { MetadataRoute } from "next";

// Lets the site be added to a phone's home screen; iPhones only allow web push from there.
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SI Rumors", short_name: "SI Rumors", description: "AI releases, rumors and usage resets, with push alerts when Codex resets.",
    start_url: "/codex/", scope: "/", display: "standalone", background_color: "#0b0d12", theme_color: "#0b0d12",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }],
  };
}
