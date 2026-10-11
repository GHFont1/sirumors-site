import type { Metadata } from "next";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { companies, stories } from "@/lib/data";
import { FeedFilter } from "@/components/FeedFilter";

export const metadata: Metadata = {
  title: "AI News Feed: Every Lab, Every Source",
  description: "Live AI news from official lab blogs, the tech press, Hacker News and Reddit, grouped so one story shows once with every outlet covering it.",
  alternates: { canonical: "/news/" },
};

export default function NewsPage() {
  const items = stories.map(({ id, title, url, source, type, publishedAt, isRumor, status, confidence, companies, sourceCount, points }) => ({ id, title, url, source, type, publishedAt, isRumor, status, confidence, companies, sourceCount, points }));
  return (
    <>
      <div className="kicker">News feed</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Everything, as it breaks</h1>
      <p className="mt-1 max-w-2xl text-muted">Official lab announcements, the tech press, Hacker News and Reddit. When many outlets cover the same story, it shows once with all of them.</p>
      <div className="mt-6">
        <FeedFilter items={items} companies={companies.map((c) => ({ slug: c.slug, name: c.name, logo: existsSync(join(process.cwd(), "public/logos", `${c.slug}.png`)) }))} />
      </div>
    </>
  );
}
