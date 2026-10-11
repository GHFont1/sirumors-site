import type { MetadataRoute } from "next";
import { companies, people, topics, generatedAt } from "@/lib/data";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://sirumors.com";
  const lastModified = new Date(generatedAt);
  const paths = ["/", "/news/", "/rumors/", "/releases/", "/codex/", "/videos/", "/trends/", "/people/", "/about/",
    ...companies.map((c) => `/c/${c.slug}/`), ...topics.map((t) => `/t/${t.slug}/`), ...people.map((p) => `/people/${p.slug}/`)];
  return paths.map((p) => ({ url: base + p, lastModified, changeFrequency: "hourly", priority: p === "/" ? 1 : 0.7 }));
}
