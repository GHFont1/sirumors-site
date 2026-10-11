import Link from "next/link";
import {
  NOW, companyBySlug, linesFor, momentum, rumorsFor, series, storiesFor, topStories, videosFor,
  type Filter, type ReleaseLine,
} from "@/lib/data";
import { daysBetween, fmtDate, pct } from "@/lib/format";
import { Logo } from "./Logo";
import { RumorMeter, StoryList } from "./Story";
import { VideoGrid } from "./Video";
import { ReleaseTimeline, Sparkline } from "./Charts";
import { FollowButton } from "./auth/UserUI";

export function Section({ title, kicker, href, linkLabel = "See all", children, className = "" }: { title: string; kicker?: string; href?: string; linkLabel?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`mt-10 ${className}`}>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          {kicker && <div className="kicker mb-1">{kicker}</div>}
          <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
        </div>
        {href && <Link href={href} className="shrink-0 text-sm font-semibold text-accent hover:underline">{linkLabel} →</Link>}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "good" | "bad" | "accent" }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="tabular mt-1 text-2xl font-extrabold tracking-tight" style={{ color: tone === "accent" ? "var(--accent)" : undefined }}>{value}</div>
      {sub && <div className="mt-0.5 text-xs" style={{ color: tone === "good" ? "var(--good)" : tone === "bad" ? "var(--bad)" : "var(--muted)" }}>{sub}</div>}
    </div>
  );
}

export function NextUpCard({ l }: { l: ReleaseLine }) {
  const last = l.releases[l.releases.length - 1];
  const days = l.expectedNext ? daysBetween(NOW, l.expectedNext) : null;
  const c = companyBySlug(l.company);
  return (
    <div className="card flex flex-col gap-2 p-4">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Logo slug={l.company} name={c?.name ?? l.name} size={20} />
        {l.name}
        <span className="ml-auto"><FollowButton kind="line" slug={l.id} label={l.name} size="sm" /></span>
      </div>
      <div className="text-xs text-muted">Last: <span className="font-semibold text-text">{last?.name}</span> · {last ? fmtDate(last.date) : "—"}</div>
      <div className="mt-auto flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Expected next</div>
          <div className="tabular text-lg font-extrabold">~{fmtDate(l.expectedNext!, false)}</div>
        </div>
        <div className="tabular text-right text-sm font-bold" style={{ color: days != null && days < 0 ? "var(--warn)" : "var(--accent-2)" }}>
          {days == null ? "" : days < 0 ? `${-days}d overdue` : days === 0 ? "today" : `in ${days}d`}
        </div>
      </div>
      <div className="text-[11px] text-faint">Every ~{l.medianGapDays} days lately</div>
    </div>
  );
}

export function RumorList({ items, wide }: { items: ReturnType<typeof rumorsFor>; wide?: boolean }) {
  if (!items.length) return <p className="py-4 text-sm text-muted">No live rumors right now.</p>;
  return (
    <div className="divide-y divide-line">
      {items.map((r) => (
        <div key={r.id} className="py-3">
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold leading-snug link-hover">{r.title}</a>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <RumorMeter s={r} wide={wide} />
            <span>{r.source}{(r.sourceCount ?? 1) > 1 ? ` +${(r.sourceCount ?? 1) - 1}` : ""}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Shared page body for a company, topic or person "super tab". */
export function Hub({ filter, kind, slug, header }: { filter: Filter; kind: "c" | "t" | "p"; slug: string; header: React.ReactNode }) {
  const all = storiesFor(filter);
  const top = topStories(all, 8);
  const topIds = new Set(top.map((s) => s.id));
  const latest = all.filter((s) => !topIds.has(s.id)).slice(0, 30);
  const rum = rumorsFor(filter).slice(0, 8);
  const vids = videosFor(filter).slice(0, 6);
  const m = momentum(kind, slug);
  const s60 = series(kind, slug, 60);
  const lines = kind === "c" ? linesFor(slug) : [];
  const next = lines.filter((l) => l.expectedNext && !l.retired && !l.stale).sort((a, b) => a.expectedNext!.localeCompare(b.expectedNext!))[0];
  const lastRel = lines.flatMap((l) => l.releases).sort((a, b) => b.date.localeCompare(a.date))[0];
  return (
    <>
      {header}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Mentions, 7 days" value={m.last7} sub={m.hasBaseline ? `${pct(m.change)} vs prior week` : m.last7 ? "Building weekly history" : "No coverage yet"} tone={m.change > 0.05 ? "good" : m.change < -0.05 ? "bad" : undefined} />
        <Stat label="Live rumors" value={rum.length} sub={rum[0] ? `Top: ${rum[0].status}` : "Quiet"} />
        {kind === "c" ? (
          <>
            <Stat label="Last release" value={lastRel ? fmtDate(lastRel.date, false) : "—"} sub={lastRel?.name} />
            <Stat label="Expected next" value={next ? `~${fmtDate(next.expectedNext!, false)}` : "—"} sub={next ? next.name : "No estimate"} tone="accent" />
          </>
        ) : (
          <>
            <Stat label="Stories, 14 days" value={all.length} />
            <Stat label="Videos" value={vids.length} sub="Last 45 days" />
          </>
        )}
      </div>
      <div className="card mt-3 p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted"><span className="font-semibold">Daily mentions, last 60 days</span><span className="tabular">peak {Math.max(...s60.map((d) => d.value))}</span></div>
        <Sparkline data={s60} height={70} />
      </div>
      <div className="mt-2 grid gap-x-10 lg:grid-cols-[1fr_340px]">
        <div>
          <Section title="Top stories" kicker="Most covered">
            <div className="card px-4"><StoryList items={top} showSummary /></div>
          </Section>
          {lines.length > 0 && (
            <Section title="Release history" kicker="Every launch" href="/releases/" linkLabel="All labs">
              <div className="card p-4">
                <ReleaseTimeline
                  lines={lines.map((l) => ({ ...l, retired: l.retired }))}
                  from={new Date(NOW - 3 * 365 * 86400000).toISOString().slice(0, 10)}
                  to={new Date(NOW + 200 * 86400000).toISOString().slice(0, 10)}
                  now={new Date(NOW).toISOString().slice(0, 10)}
                />
              </div>
            </Section>
          )}
          <Section title="Latest">
            <div className="card px-4"><StoryList items={latest} /></div>
          </Section>
        </div>
        <aside>
          <Section title="Rumors" kicker="Rated by confidence" href="/rumors/">
            <div className="card px-4"><RumorList items={rum} /></div>
          </Section>
          {next && (
            <Section title="Next up">
              <NextUpCard l={next} />
            </Section>
          )}
        </aside>
      </div>
      {vids.length > 0 && (
        <Section title="Videos" kicker="Official, interviews and breakdowns" href="/videos/">
          <VideoGrid items={vids} />
        </Section>
      )}
    </>
  );
}

export function HubHeader({ logo, name, blurb, kicker, extra, follow }: { logo?: React.ReactNode; name: string; blurb: string; kicker: string; extra?: React.ReactNode; follow?: { kind: "company" | "topic" | "person"; slug: string } }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {logo}
      <div className="min-w-0 flex-1">
        <div className="kicker">{kicker}</div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{name}</h1>
        <p className="mt-1 max-w-2xl text-muted">{blurb}</p>
        {extra}
      </div>
      {follow && (
        <div className="sm:self-start">
          <FollowButton kind={follow.kind} slug={follow.slug} label={name} />
          <p className="mt-1.5 max-w-[190px] text-xs text-faint">Get alerts for releases and strong rumors.</p>
        </div>
      )}
    </div>
  );
}
