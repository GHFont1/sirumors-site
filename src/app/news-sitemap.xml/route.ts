import { NOW, pagePath } from "@/lib/data";
import { pageItems } from "@/lib/pages";

export const dynamic = "force-static";

// Google News sitemap: our articles from the last two days.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function GET() {
  const items = pageItems().filter((p) => ["story", "rumor", "release"].includes(p.kind) && NOW - Date.parse(p.date) < 2 * 86400000 && Date.parse(p.date) <= NOW + 3600000);
  const body = items.map((p) => `<url><loc>https://sirumors.com${pagePath(p.id)}</loc><news:news><news:publication><news:name>SI Rumors</news:name><news:language>en</news:language></news:publication><news:publication_date>${new Date(p.date).toISOString()}</news:publication_date><news:title>${esc(p.headline)}</news:title></news:news></url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${body}</urlset>`, { headers: { "Content-Type": "application/xml" } });
}
