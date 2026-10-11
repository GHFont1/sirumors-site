import Link from "next/link";
import { NOW, boards, companyBySlug, markets, resetHistory, upcoming } from "@/lib/data";
import { MarketCard, ResetList, ResetStatus } from "@/components/Boards";
import { allUpdates } from "@/lib/updates";
import { daysBetween, fmtDate } from "@/lib/format";
import { UpdatesStream } from "@/components/Updates";
import { Logo } from "@/components/Logo";

// Credit Compound layout: a short header, one list of updates, and a sidebar
// with the few things people come back for.

function Side({ title, href, linkLabel, children }: { title: string; href?: string; linkLabel?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{title}</div>
      {children}
      {href && <Link href={href} className="mt-3 block text-center text-sm font-semibold text-accent hover:underline">{linkLabel} →</Link>}
    </section>
  );
}

const PICKS: [string, string][] = [["coding", "Coding"], ["agent", "Agents"], ["open", "Open model"], ["image", "Image"], ["video", "Video"]];

export default function Home() {
  const updates = allUpdates(7).slice(0, 40);
  const top = boards.find((b) => b.id === "overall");
  const leader = top?.top[0];
  const leaderCo = leader?.company ? companyBySlug(leader.company) : undefined;
  const picks = PICKS.map(([id, label]) => ({ label, b: boards.find((b) => b.id === id) })).filter((x) => x.b);
  const resets = resetHistory();
  const next = upcoming().find((l) => Date.parse(l.expectedNext!) >= NOW - 86400000);
  const odds = markets[0];

  return (
    <>
      <section className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="kicker">Independent AI intelligence</div>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">AI releases, rumors and resets</h1>
          <p className="mt-2 max-w-xl text-muted">The newest useful changes first. Every update links to where it came from.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/rankings/" className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}>Best AI models</Link>
          <Link href="/codex/" className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-bold hover:border-accent">Codex resets</Link>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
        <section>
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">Latest updates</h2>
              <p className="text-sm text-muted">Newest first, last 7 days.</p>
            </div>
            <Link href="/news/" className="shrink-0 text-sm font-semibold text-accent hover:underline">All news →</Link>
          </div>
          <UpdatesStream items={updates} />
        </section>

        <aside className="space-y-4">
          {leader && top && (
            <Side title="Best AI model right now" href="/rankings/" linkLabel="See all rankings">
              <div className="flex items-center gap-3">
                <Logo slug={leaderCo?.slug} name={leaderCo?.name ?? leader.org} size={48} />
                <div className="min-w-0">
                  <div className="truncate text-lg font-extrabold">👑 {leader.model}</div>
                  <div className="text-xs text-muted">{leaderCo?.name ?? leader.org} · #1 on Arena · {leader.rating} Elo</div>
                </div>
              </div>
            </Side>
          )}

          <Side title="Best at each job" href="/rankings/" linkLabel="See the full board">
            <ol className="space-y-1">
              {picks.map(({ label, b }, i) => {
                const r = b!.top[0];
                const co = r.company ? companyBySlug(r.company) : undefined;
                return (
                  <li key={b!.id}>
                    <Link href={`/rankings/#${b!.id}`} className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-chip">
                      <span className="tabular w-4 text-xs font-bold text-faint">{i + 1}.</span>
                      <Logo slug={co?.slug} name={co?.name ?? r.org} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-bold uppercase tracking-wider text-muted">{label}</span>
                        <span className="block truncate text-sm font-bold">{r.model}</span>
                      </span>
                      <span aria-hidden className="text-faint">→</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Side>

          <Side title="Codex resets" href="/codex/" linkLabel="Full history">
            <ResetStatus items={resets} />
            <div className="mt-2 border-t border-line"><ResetList items={resets} limit={5} /></div>
          </Side>

          {next && (
            <Side title="Next big release" href="/releases/" linkLabel="Release tracker">
              <div className="flex items-center gap-3">
                <Logo slug={next.company} name={next.name} size={36} />
                <div className="min-w-0">
                  <div className="truncate font-bold">{next.name}</div>
                  <div className="text-xs text-muted">Expected around {fmtDate(next.expectedNext!, false)} · {Math.max(0, daysBetween(NOW, next.expectedNext!))}d</div>
                </div>
              </div>
            </Side>
          )}

          {odds && (
            <div>
              <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                <span>The odds</span><Link href="/odds/" className="normal-case tracking-normal text-accent hover:underline">All odds →</Link>
              </div>
              <MarketCard m={odds} rows={3} />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
