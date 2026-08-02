import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://squircle.live",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://squircle.live/settings/pricing",
      priority: 0.9,
    },
    {
      url: "https://squircle.live/dashboard",
      priority: 0.9,
    },
    {
      url: "https://squircle.live/auth/sign-in",
      priority: 0.8,
    },
  ];
}
