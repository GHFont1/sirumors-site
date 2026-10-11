import { generatedAt } from "@/lib/data";
import { pageItems } from "@/lib/pages";
import { allUpdates } from "@/lib/updates";

export const dynamic = "force-static";

// Stories still showing the publisher's wording. The copywriter lane (scripts/copywriter.mjs,
// run on the Mac) reads this, writes our own version, and pushes it to the copy branch.
export function GET() {
  // What the home page and update feed show goes first, then everything else, newest first.
  const shown = new Map(allUpdates(7).map((u) => [u.id, u.weight]));
  const todo = pageItems()
    .filter((p) => (p.kind === "story" || p.kind === "rumor") && !p.ours && p.story)
    .sort((a, b) => (shown.get(b.id) ?? -1) - (shown.get(a.id) ?? -1) || b.date.localeCompare(a.date))
    .slice(0, 400)
    .map((p) => ({
      id: p.id, date: p.date, kind: p.kind, status: p.story!.status, confidence: p.story!.confidence,
      title: p.story!.origTitle ?? p.story!.title, text: (p.story!.summary ?? "").slice(0, 1200), source: p.story!.source,
      outlets: p.outlets, official: p.story!.type === "official", companies: p.companies,
    }));
  return Response.json({ generatedAt, count: todo.length, items: todo });
}
