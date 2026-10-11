import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { board, boardsPublished, companyBySlug, frontier, frontierBySlug, releaseFor, stories, type FrontierModel } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { Section, Stat } from "@/components/Blocks";
import { StoryList } from "@/components/Story";
import { Logo } from "@/components/Logo";

// A reference page for each model on the frontier list.
export const dynamicParams = false;
export function generateStaticParams() {
  return frontier.map((m) => ({ slug: m.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const m = frontierBySlug((await params).slug);
  return m ? { title: `${m.model}: #${m.rank} Frontier AI Model, Rankings and Release`, description: `How ${m.model} by ${m.orgName} ranks right now: #${m.rank} on the frontier list, its placing for overall, hard prompts, coding and agents, when it was released and the latest news.`, alternates: { canonical: `/models/${m.slug}/` } } : {};
}

const BOARD_NAMES: Record<string, string> = { overall: "Overall", hard: "Hard problems", coding: "Coding", agent: "Agents" };

type Bar = { label: string; value: number; pos: number; me: boolean; slug?: string };
/** Horizontal bars, this model in the accent gradient and the field in gray. Bars start at the lowest shown value so close races stay visible. */
function BarChart({ rows, unit }: { rows: Bar[]; unit: string }) {
  const hi = Math.max(...rows.map((r) => r.value));
  const lo = Math.min(...rows.map((r) => r.value));
  const span = Math.max(1e-6, hi - lo);
  return (
    <ol className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-2 text-xs" title={`#${r.pos} ${r.label}: ${r.value}${unit}`}>
          <span className="tabular w-6 shrink-0 text-right font-bold text-faint">#{r.pos}</span>
          <span className={`w-28 shrink-0 truncate sm:w-36 ${r.me ? "font-extrabold" : "font-semibold text-muted"}`}>
            {r.slug && !r.me ? <Link href={`/models/${r.slug}/`} className="link-hover">{r.label}</Link> : r.label}
          </span>
          <span className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-chip">
            <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${10 + 90 * ((r.value - lo) / span)}%`, background: r.me ? "linear-gradient(90deg, var(--accent), var(--accent-2))" : "var(--faint)", opacity: r.me ? 1 : 0.45 }} />
          </span>
          <span className={`tabular w-14 shrink-0 text-right ${r.me ? "font-extrabold" : "text-muted"}`}>{r.value}{unit}</span>
        </li>
      ))}
    </ol>
  );
}

const nameKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]/g, "");
function boardBars(m: FrontierModel, id: string): Bar[] {
  const b = board(id);
  const mine = m.boards[id];
  if (!b || !mine) return [];
  const slugOf = (name: string) => frontier.find((f) => nameKey(f.model) === nameKey(name))?.slug;
  const rows: Bar[] = b.top.slice(0, 5).map((r, i) => ({ label: r.model, value: r.rating, pos: i + 1, me: nameKey(r.model) === nameKey(m.model), slug: slugOf(r.model) }));
  if (!rows.some((r) => r.me)) rows.push({ label: m.model, value: mine.rating, pos: mine.pos, me: true });
  return rows;
}

export default async function ModelPage({ params }: { params: Promise<{ slug: string }> }) {
  const m = frontierBySlug((await params).slug);
  if (!m) notFound();
  const co = m.company ? companyBySlug(m.company) : undefined;
  const rel = releaseFor(m.model);
  const words = m.model.toLowerCase();
  const family = rel?.name.toLowerCase();
  const news = stories.filter((s) => { const t = s.title.toLowerCase(); return t.includes(words) || (!!family && t.includes(family)); }).slice(0, 12);
  const above = frontier.find((x) => x.rank === m.rank - 1);
  const below = frontier.find((x) => x.rank === m.rank + 1);
  return (
    <>
      <Link href="/models/" className="text-sm font-semibold text-accent hover:underline">← Best frontier models</Link>
      <div className="mt-3 flex items-center gap-4">
        <Logo slug={co?.slug} name={m.orgName} size={64} />
        <div className="min-w-0">
          <div className="kicker">#{m.rank} frontier model</div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{m.rank === 1 ? "👑 " : ""}{m.model}</h1>
          <div className="text-sm text-muted">
            {co ? <Link href={`/c/${co.slug}/`} className="link-hover">{co.name}</Link> : m.orgName}
            {m.open ? " · open weights" : ""}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Frontier rank" value={`#${m.rank}`} sub={`of ${frontier.length} tracked`} tone="accent" />
        <Stat label="Frontier score" value={Math.round(m.score)} sub="100 = #1 on every board" />
        <Stat label="Best placing" value={`#${Math.min(...Object.values(m.boards).map((b) => b.pos))}`} sub={BOARD_NAMES[Object.entries(m.boards).sort((a, b) => a[1].pos - b[1].pos)[0][0]]} />
        <Stat label="Released" value={rel ? fmtDate(rel.date, false) : "—"} sub={rel ? `${rel.name}${rel.date ? ` · ${new Date(rel.date).getUTCFullYear()}` : ""}` : "Not in the release tracker yet"} />
      </div>

      <Section title="Benchmarks" kicker={`${m.model} against the field`}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="card p-4 md:col-span-2">
            <div className="mb-3 flex items-baseline justify-between gap-3"><span className="text-sm font-bold">Frontier score</span><span className="text-[11px] text-faint">Average placing, 100 = #1 everywhere</span></div>
            <BarChart unit="" rows={(() => {
              const top = frontier.slice(0, 8).map((f) => ({ label: f.model, value: Math.round(f.score), pos: f.rank, me: f.slug === m.slug, slug: f.slug }));
              return top.some((r) => r.me) ? top : [...top, { label: m.model, value: Math.round(m.score), pos: m.rank, me: true }];
            })()} />
          </div>
          {Object.keys(BOARD_NAMES).map((id) => {
            const rows = boardBars(m, id);
            return (
              <div key={id} className="card p-4">
                <div className="mb-3 flex items-baseline justify-between gap-3"><span className="text-sm font-bold">{BOARD_NAMES[id]}</span><span className="text-[11px] text-faint">{id === "agent" ? "Agent score" : "Arena Elo"}</span></div>
                {rows.length ? <BarChart rows={rows} unit="" /> : <p className="py-6 text-center text-xs text-muted">{m.model} isn&apos;t on this board yet.</p>}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Where it places" kicker="Arena leaderboards">
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-wider text-muted"><th className="p-3">Board</th><th className="p-3">Placing</th><th className="p-3">Score</th><th className="p-3">Votes</th></tr></thead>
            <tbody>
              {Object.keys(BOARD_NAMES).map((id) => {
                const b = m.boards[id];
                return (
                  <tr key={id} className="border-b border-line last:border-0">
                    <td className="p-3 font-semibold"><Link href={`/rankings/#${id}`} className="link-hover">{BOARD_NAMES[id]}</Link></td>
                    <td className="tabular p-3 font-bold">{b ? `#${b.pos}` : <span className="font-normal text-faint">Not on this board</span>}</td>
                    <td className="tabular p-3">{b ? `${b.rating}${id === "agent" ? "" : " Elo"}` : ""}</td>
                    <td className="tabular p-3 text-muted">{b ? b.votes.toLocaleString("en-US") : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-faint">From blind head-to-head votes on Arena{boardsPublished ? `, published ${fmtDate(boardsPublished)}` : ""}. Variants (high, max) count once at their best.</p>
      </Section>

      {rel && (
        <Section title="Release" kicker="From the lab's own announcement">
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="font-bold">{rel.name}</div>
              <div className="text-sm text-muted">Released {fmtDate(rel.date)}</div>
            </div>
            {rel.page && <Link href={rel.page} className="chip text-sm font-semibold hover:text-accent">{rel.evidence ? `✓ ${rel.evidence.source}` : "Release details"} →</Link>}
          </div>
        </Section>
      )}

      {news.length > 0 && (
        <Section title={`Latest on ${m.model}`} kicker="News">
          <div className="card px-4"><StoryList items={news} /></div>
        </Section>
      )}

      <div className="mt-8 flex flex-wrap justify-between gap-3 text-sm">
        {above ? <Link href={`/models/${above.slug}/`} className="link-hover">↑ #{above.rank} {above.model}</Link> : <span />}
        {below && <Link href={`/models/${below.slug}/`} className="link-hover">#{below.rank} {below.model} ↓</Link>}
      </div>
    </>
  );
}
