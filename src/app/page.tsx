import Link from "next/link";
import { NOW, allReleases, frontier, markets, resetHistory, upcoming } from "@/lib/data";
import { FrontierList, LabResets, MarketCard, ReleaseFeed, ResetList } from "@/components/Boards";
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

export default function Home() {
  // Home keeps the signal: releases, resets, lab posts, real rumors and big stories. Whispers and two-outlet stories stay in News.
  const updates = allUpdates(7).filter((u) => u.weight >= 40).slice(0, 60);
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
          <Link href="/models/" className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}>Best AI models</Link>
          <Link href="/resets/" className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-bold hover:border-accent">Resets</Link>
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
          <Side title="Best frontier models" href="/models/" linkLabel="Full ranking">
            <FrontierList items={frontier} limit={10} />
          </Side>

          <Side title="Latest releases" href="/releases/" linkLabel="Release log">
            <ReleaseFeed items={allReleases()} limit={7} />
            {next && (
              <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-dashed border-line p-2.5">
                <Logo slug={next.company} name={next.name} size={22} />
                <div className="min-w-0 text-xs">
                  <div className="font-bold">Next up: {next.name}</div>
                  <div className="text-muted">Expected around {fmtDate(next.expectedNext!, false)} · {Math.max(0, daysBetween(NOW, next.expectedNext!))}d</div>
                </div>
              </div>
            )}
          </Side>

          <Side title="Resets" href="/resets/" linkLabel="Every reset">
            <LabResets items={resets} />
            <div className="mt-2 border-t border-line"><ResetList items={resets} limit={4} /></div>
          </Side>

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
