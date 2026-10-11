import type { Metadata } from "next";
import { boards, boardsPublished, frontier, markets } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { Section } from "@/components/Blocks";
import { FrontierList, MarketCard, RankBoard } from "@/components/Boards";

export const metadata: Metadata = {
  title: "Best AI Models Right Now: Rankings for Coding, Agents, Open Models, Image and Video",
  description: "Which AI model is best right now? Live rankings from Arena for overall, coding, agents, open-weights, math, writing, search, vision, image and video, plus the odds on who will be #1.",
  alternates: { canonical: "/rankings/" },
};

export default function RankingsPage() {
  const odds = markets.filter((m) => /best ai model|#1 ai model|chinese/i.test(m.title)).slice(0, 3);
  const main = boards.filter((b) => ["overall", "coding", "agent", "open"].includes(b.id));
  const more = boards.filter((b) => !main.includes(b));
  return (
    <>
      <div className="kicker">SI Rankings</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">The best AI models <span className="grad-text">right now</span></h1>
      <p className="mt-1 max-w-2xl text-muted">
        Who&apos;s #1 for everything, from millions of blind head-to-head votes on Arena{boardsPublished ? ` (updated ${fmtDate(boardsPublished)})` : ""}. Bars show how far each model trails the leader.
      </p>
      {!boards.length && <p className="card mt-6 p-6 text-sm text-muted">Rankings are loading. Check back shortly.</p>}
      {frontier.length > 0 && (
        <Section title="Best frontier models" kicker="One list, in order" href="/models/" linkLabel="Full ranking">
          <div className="card p-3 sm:columns-2 sm:gap-6"><FrontierList items={frontier} limit={10} /></div>
        </Section>
      )}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {main.map((b) => <div key={b.id} id={b.id} className="scroll-mt-32"><RankBoard b={b} /></div>)}
      </div>
      {odds.length > 0 && (
        <Section title="Who will be #1 next?" kicker="The odds" href="/odds/" linkLabel="All odds">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{odds.map((m) => <MarketCard key={m.id} m={m} />)}</div>
        </Section>
      )}
      <Section title="Best at everything else" kicker="Specialist leaderboards">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {more.map((b) => <div key={b.id} id={b.id} className="scroll-mt-32"><RankBoard b={b} rows={4} /></div>)}
        </div>
      </Section>
      <p className="mt-8 text-xs text-faint">Source: Arena (arena.ai) public leaderboards. Variants of one model (high, max, thinking) are shown once at their best score. Agent board scores are win rates, not Elo.</p>
    </>
  );
}
