import type { Metadata } from "next";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { companies, people, releaseLines, topics } from "@/lib/data";
import { MyFeed } from "@/components/community/MyFeed";

export const metadata: Metadata = { title: "My Feed", robots: { index: false } };

export default function MePage() {
  const has = (s: string) => existsSync(join(process.cwd(), "public/logos", `${s}.png`));
  const picks = [
    ...companies.map((c) => ({ kind: "company" as const, slug: c.slug, name: c.name, logo: has(c.slug) ? c.slug : undefined })),
    ...releaseLines.filter((l) => !l.retired).map((l) => ({ kind: "line" as const, slug: l.id, name: l.name, logo: has(l.company) ? l.company : undefined })),
    ...people.map((p) => ({ kind: "person" as const, slug: p.slug, name: p.name })),
    ...topics.map((t) => ({ kind: "topic" as const, slug: t.slug, name: t.name })),
  ];
  return <MyFeed picks={picks} />;
}
