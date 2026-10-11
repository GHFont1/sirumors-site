import type { Metadata } from "next";
import { markets } from "@/lib/data";
import { MarketCard } from "@/components/Boards";
import { Section } from "@/components/Blocks";

export const metadata: Metadata = {
  title: "AI Odds: Prediction Markets on Models, Releases, AGI and IPOs",
  description: "Live odds on the AI race: which lab has the best model, when the next GPT, Gemini and Claude ship, AGI, OpenAI and Anthropic IPOs.",
  alternates: { canonical: "/odds/" },
};

const GROUPS: { title: string; kicker: string; re: RegExp }[] = [
  { title: "Who has the best model", kicker: "The race for #1", re: /best ai model|#1 ai model|chinese|arena score/i },
  { title: "When's the next drop", kicker: "Release odds", re: /released|release|debut|launch/i },
  { title: "AGI and breakthroughs", kicker: "The big ones", re: /agi|millennium|humanity.?s last exam|superintelligen/i },
  { title: "Money", kicker: "IPOs, valuations and deals", re: /ipo|valuation|market cap|acquired|flip/i },
];

export default function OddsPage() {
  const used = new Set<string>();
  const groups = GROUPS.map((g) => {
    const list = markets.filter((m) => !used.has(m.id) && g.re.test(m.title)).slice(0, 9);
    list.forEach((m) => used.add(m.id));
    return { ...g, list };
  });
  const rest = markets.filter((m) => !used.has(m.id)).slice(0, 9);
  return (
    <>
      <div className="kicker">The odds</div>
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">What the money says <span className="grad-text">happens next</span></h1>
      <p className="mt-1 max-w-2xl text-muted">Live prediction-market odds on the AI race, refreshed every 30 minutes. ▲▼ is the move in the last 24 hours.</p>
      {!markets.length && <p className="card mt-6 p-6 text-sm text-muted">Odds are loading. Check back shortly.</p>}
      {[...groups, { title: "Everything else", kicker: "More AI markets", list: rest }].filter((g) => g.list.length).map((g) => (
        <Section key={g.title} title={g.title} kicker={g.kicker}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">{g.list.map((m) => <MarketCard key={m.id} m={m} />)}</div>
        </Section>
      ))}
      <p className="mt-8 text-xs text-faint">Odds are market prices, not predictions by SI Rumors. Not financial advice.</p>
    </>
  );
}
