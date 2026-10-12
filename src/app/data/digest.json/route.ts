import { NOW, companyBySlug, generatedAt } from "@/lib/data";
import { pageById } from "@/lib/pages";
import { allUpdates, leadUpdates } from "@/lib/updates";

export const dynamic = "force-static";

// What the morning email carries: the biggest items of the last 24 hours, in our words.
// scripts/notify.mjs reads this from the live site.
export function GET() {
  // The last day's biggest items; on a quiet day, reach back to two days and include tool versions.
  const recent = (h: number, w: number) => allUpdates(3).filter((u) => NOW - Date.parse(u.date) < h * 3600000 && Date.parse(u.date) <= NOW + 3600000 && u.weight >= w);
  const day = recent(26, 40).length >= 3 ? recent(26, 40) : recent(50, 35);
  const items = leadUpdates(day, 8).map((u) => {
    const p = pageById(u.url.replace(/^\/n\/|\/$/g, ""));
    return { badge: u.badge, headline: p?.headline ?? u.headline, summary: p?.dek ?? p?.body[0] ?? u.summary ?? "", url: u.url, company: u.company ? companyBySlug(u.company)?.name : undefined, date: u.date };
  });
  return Response.json({ generatedAt, items });
}
