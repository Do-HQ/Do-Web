import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Squircle – Where Teams Turn Ideas into Action",
    short_name: "Squircle",
    description:
      "The modern workspace for teams — capture ideas, plan work, collaborate in real time, and ship.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    categories: ["productivity", "business"],
    icons: [
      {
        src: "/images/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: "/images/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/images/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        short_name: "Dashboard",
        url: "/dashboard",
        icons: [{ src: "/images/favicon-32x32.png", sizes: "32x32" }],
      },
      {
        name: "Projects",
        short_name: "Projects",
        url: "/projects",
        icons: [{ src: "/images/favicon-32x32.png", sizes: "32x32" }],
      },
      {
        name: "Spaces",
        short_name: "Spaces",
        url: "/spaces",
        icons: [{ src: "/images/favicon-32x32.png", sizes: "32x32" }],
      },
    ],
  };
}
