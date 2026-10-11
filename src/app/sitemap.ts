import type { MetadataRoute } from "next";
import { companies, frontier, people, topics, generatedAt } from "@/lib/data";
import forums from "../../config/forums.json";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://sirumors.com";
  const lastModified = new Date(generatedAt);
  const paths = ["/", "/news/", "/rankings/", "/odds/", "/rumors/", "/releases/", "/codex/", "/resets/", "/models/", "/videos/", "/trends/", "/people/", "/about/",
    ...companies.map((c) => `/c/${c.slug}/`), ...topics.map((t) => `/t/${t.slug}/`), ...people.map((p) => `/people/${p.slug}/`), ...frontier.map((m) => `/models/${m.slug}/`), "/forums/", "/leaderboard/", ...forums.categories.map((c) => `/forums/c/${c.slug}/`)];
  return paths.map((p) => ({ url: base + p, lastModified, changeFrequency: "hourly", priority: p === "/" ? 1 : 0.7 }));
}
