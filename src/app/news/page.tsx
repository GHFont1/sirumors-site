import type { Metadata } from "next";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { companies, foldedInto, stories } from "@/lib/data";
import { credLabel } from "@/lib/major";
import { FeedFilter } from "@/components/FeedFilter";

export const metadata: Metadata = {
  title: "AI News, Lab Announcements and Rumors",
  description: "Follow AI launches and announcements from the labs, compare coverage from major outlets, and filter the news by company.",
  alternates: { canonical: "/news/" },
};

export default function NewsPage() {
  const items = stories.map((s) => ({ id: s.id, title: s.title, url: s.url, source: credLabel(s, foldedInto.get(s.id)), type: s.type, publishedAt: s.publishedAt, isRumor: s.isRumor, status: s.status, confidence: s.confidence, companies: s.companies }));
  return (
    <>
      <div className="kicker">News feed</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">AI news and lab announcements</h1>
      <p className="mt-1 max-w-2xl text-muted">Browse announcements, reporting and rumors by company and source type.</p>
      <div className="mt-6">
        <FeedFilter items={items} companies={companies.map((c) => ({ slug: c.slug, name: c.name, logo: existsSync(join(process.cwd(), "public/logos", `${c.slug}.png`)) }))} />
      </div>
    </>
  );
}
