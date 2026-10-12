import { NOW, companyBySlug, generatedAt } from "@/lib/data";
import { pageById } from "@/lib/pages";
import { allUpdates, leadUpdates } from "@/lib/updates";

export const dynamic = "force-static";

// What the morning email carries: the biggest items of the last 24 hours, in our words.
// scripts/notify.mjs reads this from the live site.
export function GET() {
  const day = allUpdates(2).filter((u) => NOW - Date.parse(u.date) < 26 * 3600000 && u.weight >= 40);
  const items = leadUpdates(day, 8).map((u) => {
    const p = pageById(u.url.replace(/^\/n\/|\/$/g, ""));
    return { badge: u.badge, headline: p?.headline ?? u.headline, summary: p?.dek ?? p?.body[0] ?? u.summary ?? "", url: u.url, company: u.company ? companyBySlug(u.company)?.name : undefined, date: u.date };
  });
  return Response.json({ generatedAt, items });
}
