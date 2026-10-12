import { NOW, pagePath } from "@/lib/data";
import { pageItems } from "@/lib/pages";

export const dynamic = "force-static";

// RSS: the newest 60 articles, for readers and for search engines discovering new pages.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function GET() {
  const items = pageItems()
    .filter((p) => ["story", "rumor", "release", "reset"].includes(p.kind) && Date.parse(p.date) <= NOW + 3600000)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 60);
  const xml = items.map((p) => {
    const url = `https://sirumors.com${pagePath(p.id)}`;
    return `<item><title>${esc(p.headline)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${new Date(p.date.length === 10 ? p.date + "T12:00:00Z" : p.date).toUTCString()}</pubDate><category>${esc(p.badge)}</category><description>${esc(p.dek ?? p.body[0] ?? p.headline)}</description></item>`;
  }).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>SI Rumors</title><link>https://sirumors.com/</link><atom:link href="https://sirumors.com/feed.xml" rel="self" type="application/rss+xml"/><description>AI releases, rumors and resets, written by SI Rumors.</description><language>en-us</language><lastBuildDate>${new Date(NOW).toUTCString()}</lastBuildDate>${xml}</channel></rss>`, { headers: { "Content-Type": "application/rss+xml" } });
}
