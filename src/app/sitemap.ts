import type { MetadataRoute } from "next";
import { companies, frontier, people, topics, generatedAt, pagePath } from "@/lib/data";
import { pageItems } from "@/lib/pages";
import forums from "../../config/forums.json";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://sirumors.com";
  const lastModified = new Date(generatedAt);
  const paths = ["/", "/news/", "/rankings/", "/odds/", "/rumors/", "/releases/", "/codex/", "/claude/", "/resets/", "/models/", "/videos/", "/trends/", "/people/", "/about/", "/faq/", "/contact/", "/terms/", "/privacy/",
    ...companies.map((c) => `/c/${c.slug}/`), ...topics.map((t) => `/t/${t.slug}/`), ...people.map((p) => `/people/${p.slug}/`), ...frontier.map((m) => `/models/${m.slug}/`), "/forums/", "/leaderboard/", ...forums.categories.map((c) => `/forums/c/${c.slug}/`)];
  // Every article page too: stories, rumors, releases, resets, tool versions and videos.
  const articles = pageItems().map((p) => ({ url: base + pagePath(p.id), lastModified: new Date(p.date.length === 10 ? p.date + "T12:00:00Z" : p.date), changeFrequency: "daily" as const, priority: p.kind === "story" || p.kind === "rumor" || p.kind === "release" ? 0.8 : 0.5 }));
  return [...paths.map((p) => ({ url: base + p, lastModified, changeFrequency: "hourly" as const, priority: p === "/" ? 1 : 0.7 })), ...articles];
}
