import Link from "next/link";
import { NOW, companies, momentum, releaseLines, repos, resets, rumors, series, upcoming, videos, companyBySlug } from "@/lib/data";
import { allUpdates, leadUpdates } from "@/lib/updates";
import { daysBetween, pct } from "@/lib/format";
import { NextUpCard, RumorList, Section } from "@/components/Blocks";
import { JustIn, LeadCard, SubLead, UpdatesStream } from "@/components/Updates";
import { VideoGrid } from "@/components/Video";
import { Logo } from "@/components/Logo";
import { ReleaseTimeline, Sparkline } from "@/components/Charts";
import { FollowButton } from "@/components/auth/UserUI";

export default function Home() {
  const all = allUpdates(7);
  const [lead, ...subs] = leadUpdates(all.filter((u) => NOW - Date.parse(u.date) < 3 * 86400000), 4);
  const leadIds = new Set([lead, ...subs].filter(Boolean).map((u) => u.id));
  const stream = all.filter((u) => !leadIds.has(u.id));
  const next = upcoming();
  const soonest = next.find((l) => Date.parse(l.expectedNext!) >= NOW - 86400000) ?? next[0];
  const lastReset = resets.find((r) => r.product === "Codex");
  const cli = repos.find((r) => r.repo === "openai/codex")?.releases.find((r) => !r.pre);
  const trending = companies
    .map((c) => ({ c, m: momentum("c", c.slug), s: series("c", c.slug, 30) }))
    .filter((x) => x.m.last7 > 0)
    .sort((a, b) => b.m.last7 - a.m.last7)
    .slice(0, 8);
  const vids = [...videos].filter((v) => NOW - Date.parse(v.publishedAt) < 10 * 86400000).sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 6);
  const majorLines = releaseLines.filter((l) => ["openai-gpt", "claude-opus", "claude-sonnet", "gemini", "grok", "deepseek"].includes(l.id));
  const today = all.filter((u) => NOW - Date.parse(u.date) < 86400000).length;

  return (
    <>
      <section className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="kicker">Updates · rumors · releases</div>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Superintelligence news, <span className="grad-text">before it&apos;s news.</span>
          </h1>
        </div>
        <div className="chip self-start sm:self-auto"><span className="live-dot" /> {today} updates today · {all.length} this week</div>
      </section>

      <div className="mt-4"><JustIn items={all.slice(0, 8)} /></div>

      {lead && (
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_1fr] [&>*]:min-w-0">
          <LeadCard u={lead} />
          <div className="grid gap-3">{subs.map((u) => <SubLead key={u.id} u={u} />)}</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-[minmax(0,1fr)_330px] [&>*]:min-w-0">
        <Section title="Every update" kicker="Newest first, last 7 days" href="/news/" linkLabel="All news">
          <UpdatesStream items={stream} />
        </Section>
        <aside>
          {soonest && (
            <Section title="Next drop" kicker="Countdown" href="/releases/" linkLabel="Tracker">
              <NextUpCard l={soonest} />
            </Section>
          )}
          <Section title="Codex status" kicker="Resets and versions" href="/codex/" linkLabel="Tracker">
            <div className="card divide-y divide-line px-4 text-sm">
              <div className="flex items-center justify-between py-3">
                <span className="text-muted">Last reset reported</span>
                <span className="font-bold">{lastReset ? `${daysBetween(lastReset.date, NOW)}d ago` : "—"}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-muted">Codex CLI</span>
                <a href={cli?.url} target="_blank" rel="noopener noreferrer" className="font-bold link-hover">{cli ? `v${cli.name.replace(/^v/, "")}` : "—"}</a>
              </div>
              <div className="py-3"><FollowButton kind="topic" slug="codex" label="Codex" size="sm" /> <span className="ml-1 text-xs text-faint">Get reset alerts</span></div>
            </div>
          </Section>
          <Section title="Rumor board" kicker="Rated by confidence" href="/rumors/">
            <div className="card px-4"><RumorList items={rumors.slice(0, 6)} /></div>
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
