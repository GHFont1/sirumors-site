import { stories, releaseLines, companies, topics, people } from "@/lib/data";

export const dynamic = "force-static";

// Compact feed for signed-in pages (My feed) that filter on the client.
export function GET() {
  return Response.json({
    stories: stories.slice(0, 600).map((s) => ({ id: s.id, t: s.title, u: s.url, s: s.source, d: s.publishedAt, ty: s.type, r: s.isRumor ? s.status : undefined, cf: s.confidence, c: s.companies, tp: s.topics, p: s.people, n: s.sourceCount })),
    lines: releaseLines.map((l) => ({ id: l.id, name: l.name, company: l.company, last: l.releases[l.releases.length - 1], next: l.retired || l.stale ? null : l.expectedNext })),
    names: Object.fromEntries([...companies.map((c) => [`company:${c.slug}`, c.name]), ...topics.map((t) => [`topic:${t.slug}`, t.name]), ...people.map((p) => [`person:${p.slug}`, p.name]), ...releaseLines.map((l) => [`line:${l.id}`, l.name])]),
  });
}
