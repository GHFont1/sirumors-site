import Link from "next/link";
import { NOW, allReleases, frontier, markets, resetHistory, upcoming } from "@/lib/data";
import { FrontierList, LabResets, MarketCard, ReleaseFeed, ResetList } from "@/components/Boards";
import { daysBetween, fmtDate } from "@/lib/format";
import { Logo } from "@/components/Logo";

// The right-hand column on the home page and every story page: the things people come back for.

function Side({ title, href, linkLabel, children }: { title: string; href?: string; linkLabel?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{title}</div>
      {children}
      {href && <Link href={href} className="mt-3 block text-center text-sm font-semibold text-accent hover:underline">{linkLabel} →</Link>}
    </section>
  );
}

export function Sidebar() {
  const resets = resetHistory();
  const next = upcoming().find((l) => Date.parse(l.expectedNext!) >= NOW - 86400000);
  const odds = markets[0];
  return (
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
  );
}
