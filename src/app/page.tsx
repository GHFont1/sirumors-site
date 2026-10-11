import Link from "next/link";
import {
  NOW, companies, momentum, releaseLines, resets, rumors, series, stories, topStories, upcoming, videos, meta, companyBySlug,
} from "@/lib/data";
import { daysBetween, fmtDate, pct } from "@/lib/format";
import { NextUpCard, RumorList, Section, Stat } from "@/components/Blocks";
import { StoryList } from "@/components/Story";
import { VideoGrid } from "@/components/Video";
import { Logo } from "@/components/Logo";
import { ReleaseTimeline, Sparkline } from "@/components/Charts";

export default function Home() {
  const fresh = stories.filter((s) => NOW - Date.parse(s.publishedAt) < 48 * 3600000);
  const top = topStories(stories.filter((s) => NOW - Date.parse(s.publishedAt) < 72 * 3600000), 10);
  const topIds = new Set(top.map((s) => s.id));
  const latest = stories.filter((s) => !topIds.has(s.id)).slice(0, 20);
  const official = stories.filter((s) => s.type === "official").slice(0, 6);
  const next = upcoming();
  const soonest = next.find((l) => Date.parse(l.expectedNext!) >= NOW - 86400000) ?? next[0];
  const lastReset = resets.find((r) => r.product === "Codex");
  const trending = companies
    .map((c) => ({ c, m: momentum("c", c.slug), s: series("c", c.slug, 30) }))
    .filter((x) => x.m.last7 > 0)
    .sort((a, b) => b.m.last7 - a.m.last7)
    .slice(0, 8);
  const vids = [...videos].filter((v) => NOW - Date.parse(v.publishedAt) < 10 * 86400000).sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 6);
  const majorLines = releaseLines.filter((l) => ["openai-gpt", "claude-opus", "claude-sonnet", "gemini", "grok", "deepseek"].includes(l.id));

  return (
    <>
      <section className="pt-2">
        <div className="chip"><span className="live-dot" /> Live · {meta.counts?.items ?? stories.length} stories tracked from {Object.values(meta.health ?? {}).filter((h) => h.ok).length} sources</div>
        <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
          Superintelligence news, <span className="grad-text">before it&apos;s news.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">Every lab, every leak, every launch. Rumors rated by confidence, release history charted, the next drop estimated.</p>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Stories, 48 hours" value={fresh.length} sub={`${fresh.filter((s) => s.type === "official").length} official announcements`} />
        <Stat label="Live rumors" value={rumors.length} sub={`${rumors.filter((r) => r.status === "strong").length} rated strong`} />
        <Stat
          label="Next expected drop"
          value={soonest ? `~${fmtDate(soonest.expectedNext!, false)}` : "—"}
          sub={soonest ? soonest.name : ""}
          tone="accent"
        />
        <Stat
          label="Last Codex reset story"
          value={lastReset ? `${daysBetween(lastReset.date, NOW)}d ago` : "—"}
          sub={lastReset ? <Link href="/codex/" className="hover:underline">{fmtDate(lastReset.date)} · see tracker</Link> : "Tracking"}
        />
      </div>

      <div className="grid gap-x-10 lg:grid-cols-[1fr_340px]">
        <div>
          <Section title="Top stories" kicker="What everyone's covering" href="/news/">
            <div className="card px-4"><StoryList items={top} ranked showSummary /></div>
          </Section>
          <Section title="Straight from the labs" kicker="Official announcements" href="/news/">
            <div className="card px-4"><StoryList items={official} /></div>
          </Section>
        </div>
        <aside>
          <Section title="Rumor board" kicker="Rated by confidence" href="/rumors/">
            <div className="card px-4"><RumorList items={rumors.slice(0, 7)} /></div>
          </Section>
          <Section title="Trending this week" kicker="Mentions, 7 days" href="/trends/">
            <div className="card divide-y divide-line px-4">
              {trending.map(({ c, m, s }) => (
                <Link key={c.slug} href={`/c/${c.slug}/`} className="flex items-center gap-3 py-2.5 hover:text-accent">
                  <Logo slug={c.slug} name={c.name} size={22} />
                  <span className="w-24 truncate text-sm font-semibold">{c.name.replace(/ AI$/, "")}</span>
                  <span className="min-w-0 flex-1"><Sparkline data={s} height={24} /></span>
                  <span className="tabular w-10 text-right text-sm font-bold">{m.last7}</span>
                  <span className="tabular w-12 text-right text-xs" style={{ color: m.change >= 0 ? "var(--good)" : "var(--bad)" }}>{m.hasBaseline ? pct(m.change) : "new"}</span>
                </Link>
              ))}
            </div>
          </Section>
        </aside>
      </div>

      <Section title="Next up: expected releases" kicker="Estimated from each lab's recent pace" href="/releases/" linkLabel="Release tracker">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {next.slice(0, 4).map((l) => <NextUpCard key={l.id} l={l} />)}
        </div>
      </Section>

      <Section title="Release history" kicker="Frontier models, last 2 years" href="/releases/">
        <div className="card p-4">
          <ReleaseTimeline
            lines={majorLines.map((l) => ({ ...l, href: `/c/${l.company}/` }))}
            from={new Date(NOW - 730 * 86400000).toISOString().slice(0, 10)}
            to={new Date(NOW + 120 * 86400000).toISOString().slice(0, 10)}
            now={new Date(NOW).toISOString().slice(0, 10)}
          />
        </div>
      </Section>

      {vids.length > 0 && (
        <Section title="Most watched" kicker="Videos, last 10 days" href="/videos/">
          <VideoGrid items={vids} />
        </Section>
      )}

      <Section title="Latest" kicker="Everything, newest first" href="/news/">
        <div className="card px-4"><StoryList items={latest} /></div>
      </Section>

      <Section title="Every super tab" kicker="Pick your feed">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {companies.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}/`} className="card flex items-center gap-3 p-3 hover:border-accent">
              <Logo slug={c.slug} name={c.name} size={28} />
              <span className="text-sm font-semibold">{companyBySlug(c.slug)?.name}</span>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
